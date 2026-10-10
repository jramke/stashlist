<?php

declare(strict_types=1);

namespace App\Enums;

use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\AbstractProvider;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * The identity providers a user can sign in with. A provider is on when its client id and secret are set, so a
 * self-hosted instance without OAuth apps shows no buttons and keeps email and password.
 */
#[TypeScript]
enum SocialProvider: string
{
    case GitHub = 'github';
    case Google = 'google';

    public function label(): string
    {
        return match ($this) {
            self::GitHub => 'GitHub',
            self::Google => 'Google',
        };
    }

    public function isConfigured(): bool
    {
        return (
            filled(config("services.{$this->value}.client_id")) &&
            filled(config("services.{$this->value}.client_secret"))
        );
    }

    /**
     * The providers that have an OAuth app configured.
     *
     * @return list<self>
     */
    public static function configured(): array
    {
        return array_values(array_filter(self::cases(), static fn (self $provider): bool => $provider->isConfigured()));
    }

    /**
     * The Socialite driver, asking for the email address. GitHub only answers with an email it has verified when
     * "user:email" is among the scopes; Google asks for "openid profile email" by default.
     */
    public function driver(): AbstractProvider
    {
        /** @var AbstractProvider $driver both are OAuth 2 drivers */
        $driver = Socialite::driver($this->value);

        return match ($this) {
            self::GitHub => $driver->scopes(['user:email']),
            self::Google => $driver,
        };
    }
}
