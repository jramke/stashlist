<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Auth\ResolveSocialUser;
use App\Actions\Auth\SocialLoginRefused;
use App\Data\ToastData;
use App\Enums\SocialProvider;
use GuzzleHttp\Exception\ClientException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Lang;
use Laravel\Socialite\Two\InvalidStateException;
use Symfony\Component\HttpFoundation\RedirectResponse as ProviderRedirect;

final class SocialLoginController extends Controller
{
    public function redirect(SocialProvider $provider): ProviderRedirect
    {
        abort_unless($provider->isConfigured(), code: 404);

        return $provider->driver()->redirect();
    }

    public function callback(Request $request, SocialProvider $provider, ResolveSocialUser $resolve): RedirectResponse
    {
        abort_unless($provider->isConfigured(), code: 404);

        // The person pressed "cancel" on the provider's page, or the provider refused.
        if ($request->has('error')) {
            return $this->failed(Lang::string('Signing in with :provider was cancelled.', [
                'provider' => $provider->label(),
            ]));
        }

        try {
            $user = $resolve->resolve($provider, $provider->driver()->user());
        } catch (SocialLoginRefused $refused) {
            return $this->failed($refused->getMessage());
        } catch (InvalidStateException|ClientException) {
            // An old or replayed callback, or a code the provider no longer accepts.
            return $this->failed(SocialLoginRefused::tryAgain($provider)->getMessage());
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return redirect()->intended(config('fortify.home'));
    }

    private function failed(string $message): RedirectResponse
    {
        ToastData::error($message)->flash();

        return to_route('login');
    }
}
