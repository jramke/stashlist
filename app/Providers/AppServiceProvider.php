<?php

declare(strict_types=1);

namespace App\Providers;

use App\Extraction\DnsHostResolver;
use App\Extraction\HostResolver;
use App\Models\User;
use App\Pipeline\PipelineJob;
use App\Search\MakeSearchableUniquely;
use Carbon\CarbonImmutable;
use GuzzleHttp\Client;
use GuzzleHttp\ClientInterface;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Laravel\Pulse\Facades\Pulse;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Scout\Scout;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(HostResolver::class, DnsHostResolver::class);
        $this->app->bind(ClientInterface::class, Client::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureRateLimiting();
        $this->configurePulse();

        Scout::makeSearchableUsing(MakeSearchableUniquely::class);
    }

    /**
     * Pulse sits behind the same admin list as Horizon. Pulse's own default gate only opens it locally, and it
     * would show a Gravatar of every user, which tells a third party their hashed email: leave the avatar out.
     */
    protected function configurePulse(): void
    {
        Gate::define('viewPulse', static fn (?User $user): bool => app()->isLocal() || $user?->isAdmin() === true);

        Pulse::user(static fn (User $user): array => ['name' => $user->name, 'extra' => $user->email]);
    }

    /**
     * Per-user limits, so typing cannot run up the bill and one client cannot flood the queues.
     */
    protected function configureRateLimiting(): void
    {
        $perUser = static fn (Request $request): string => (string)(Auth::id() ?? $request->ip());

        RateLimiter::for('capture', static fn (Request $request): Limit => Limit::perMinute(60)->by($perUser(
            $request,
        )));
        // Only a search is limited, the plain feed is not. Typing sends a request per pause.
        RateLimiter::for('search', static fn (Request $request): Limit => $request->filled('q')
            ? Limit::perMinute(90)->by($perUser($request))
            : Limit::none());
        // The API is limited per token, not per user: one runaway client must not lock the others out.
        $perToken = static function (Request $request): string {
            /** @var User|null $user */
            $user = $request->user();
            $token = $user?->currentAccessToken();

            return 'token:'.($token instanceof PersonalAccessToken ? (string)$token->getKey() : (string)$request->ip());
        };

        RateLimiter::for('api-create', static fn (Request $request): Limit => Limit::perMinute(
            config()->integer('stashlist.api.creates_per_minute'),
        )->by($perToken($request)));
        RateLimiter::for('api-lookup', static fn (Request $request): Limit => Limit::perMinute(
            config()->integer('stashlist.api.lookups_per_minute'),
        )->by($perToken($request)));
        // The model calls (plan 4.6): all users together, and each user on their own so that one big import
        // cannot keep everyone else waiting. These limit jobs, not requests.
        RateLimiter::for('llm', static fn (): Limit => Limit::perMinute(config()->integer('stashlist.ai.llm_rpm'))->by(
            'global',
        ));
        RateLimiter::for('user-ai', static fn (PipelineJob $job): Limit => Limit::perMinute(
            config()->integer('stashlist.ai.user_rpm'),
        )->by("user:{$job->userId}"));
        RateLimiter::for('reprocess', static fn (Request $request): Limit => Limit::perMinute(10)->by($perUser(
            $request,
        )));
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        // Throws on lazy loading, silently discarded fills and missing attributes (outside production).
        Model::shouldBeStrict(! app()->isProduction());

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(static fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null);
    }
}
