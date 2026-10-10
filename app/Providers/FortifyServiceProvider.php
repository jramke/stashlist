<?php

declare(strict_types=1);

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Auth\Registration;
use App\Enums\RegistrationMode;
use App\Enums\SocialProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void {}

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::createUsersUsing(CreateNewUser::class);
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(static fn () => Inertia::render('auth/login', [
            'providers' => SocialProvider::configured(),
        ]));

        Fortify::registerView(static function (Request $request) {
            // Fortify calls a view with the request only, so the service is asked for here.
            $registration = resolve(Registration::class);

            $registration->remember($request->query('invite') === null ? null : $request->string('invite')->toString());

            return Inertia::render('auth/register', [
                'passwordRules' => Password::defaults()->toPasswordRulesString(),
                'providers' => SocialProvider::configured(),
                'registration' => $registration->isAccepting() ? $registration->mode() : RegistrationMode::Closed,
                'invite' => $registration->remembered(),
            ]);
        });
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('login', static function (Request $request) {
            $throttleKey = Str::transliterate(
                Str::lower((string)$request->input(Fortify::username())).'|'.(string)$request->ip(),
            );

            return Limit::perMinute(5)->by($throttleKey);
        });
    }
}
