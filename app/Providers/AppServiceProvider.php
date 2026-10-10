<?php

declare(strict_types=1);

namespace App\Providers;

use App\Extraction\DnsHostResolver;
use App\Extraction\HostResolver;
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
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
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

        Scout::makeSearchableUsing(MakeSearchableUniquely::class);
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
