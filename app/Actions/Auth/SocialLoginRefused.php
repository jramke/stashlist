<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Enums\SocialProvider;
use Illuminate\Support\Facades\Lang;
use RuntimeException;

/**
 * A sign-in through a provider that must not go ahead. The message is written for the person who sees it.
 */
final class SocialLoginRefused extends RuntimeException
{
    /**
     * No email, or one the provider has not verified. Both look the same on purpose: whether an account with
     * that address exists is none of the visitor's business.
     */
    public static function noVerifiedEmail(SocialProvider $provider): self
    {
        return new self(Lang::string('We need a verified email address from :provider to sign you in.', [
            'provider' => $provider->label(),
        ]));
    }

    public static function closing(): self
    {
        return new self(Lang::string('This account is being deleted.'));
    }

    public static function tryAgain(SocialProvider $provider): self
    {
        return new self(Lang::string('Signing in with :provider did not work. Please try again.', [
            'provider' => $provider->label(),
        ]));
    }
}
