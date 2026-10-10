<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Auth\Registration;
use App\Auth\RegistrationRefused;
use App\Enums\SocialProvider;
use App\Models\OAuthAccount;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Socialite\AbstractUser;
use Laravel\Socialite\Contracts\User as SocialUser;

/**
 * Finds or creates the user behind a sign-in with GitHub or Google (plan 6.4).
 *
 *  1. A known (provider, provider id) is that user.
 *  2. Otherwise the provider must vouch for an email address. If a user has it, the identity is linked to them;
 *     if nobody has it, an account without a password is created.
 *  3. An email the provider has not verified is never used, neither to link nor to create an account: anyone
 *     can claim an address with an unverified provider account.
 */
final class ResolveSocialUser
{
    public function __construct(
        private readonly Registration $registration,
    ) {}

    /**
     * @throws SocialLoginRefused
     */
    public function resolve(SocialProvider $provider, SocialUser $social): User
    {
        $user = $this->known($provider, $social) ?? $this->linkOrCreate($provider, $social);

        if ($user->deleting_at !== null) {
            throw SocialLoginRefused::closing();
        }

        return $user;
    }

    private function known(SocialProvider $provider, SocialUser $social): ?User
    {
        $account = OAuthAccount::query()
            ->where('provider', $provider->value)
            ->where('provider_id', $this->providerId($social))
            ->first();

        if ($account === null) {
            return null;
        }

        $account->update(['email' => $social->getEmail(), 'avatar_url' => $social->getAvatar()]);

        return $account->user;
    }

    private function linkOrCreate(SocialProvider $provider, SocialUser $social): User
    {
        $email = $this->verifiedEmail($provider, $social) ?? throw SocialLoginRefused::noVerifiedEmail($provider);

        try {
            /** @var User */
            return DB::transaction(function () use ($provider, $social, $email): User {
                $user = User::query()->where('email', $email)->first() ?? $this->register($social, $email);

                $user->oauthAccounts()->create([
                    'provider' => $provider->value,
                    'provider_id' => $this->providerId($social),
                    'email' => $email,
                    'avatar_url' => $social->getAvatar(),
                ]);

                return $user;
            });
        } catch (UniqueConstraintViolationException) {
            // The same person finished two sign-ins at once; the second one finds the account the first made.
            throw SocialLoginRefused::tryAgain($provider);
        }
    }

    /**
     * A person new to the site: registration has to allow it, with the invitation they came with.
     */
    private function register(SocialUser $social, string $email): User
    {
        try {
            return $this->registration->register($email, code: null, create: fn (): User => $this->create(
                $social,
                $email,
            ));
        } catch (RegistrationRefused $refused) {
            throw SocialLoginRefused::registrationRefused($refused);
        }
    }

    private function create(SocialUser $social, string $email): User
    {
        $name = trim((string)$social->getName()) ?: trim((string)$social->getNickname()) ?: Str::before($email, '@');

        $user = new User(['name' => $name, 'email' => $email]);
        $user->email_verified_at = CarbonImmutable::now();
        $user->save();

        return $user;
    }

    /**
     * The email address when the provider says it checked it. Socialite's GitHub driver only returns the primary
     * address when it is verified (with the "user:email" scope, see SocialProvider::driver()); Google says so in
     * the "email_verified" claim.
     */
    private function verifiedEmail(SocialProvider $provider, SocialUser $social): ?string
    {
        $email = trim((string)$social->getEmail());

        if ($email === '') {
            return null;
        }

        $raw = $social instanceof AbstractUser ? $social->getRaw() : [];

        $verified = match ($provider) {
            SocialProvider::GitHub => true,
            SocialProvider::Google => filter_var($raw['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN),
        };

        return $verified ? Str::lower($email) : null;
    }

    /**
     * GitHub's id is a number in its JSON, Google's a string; the column holds text, and text is what it is
     * compared with ("007" must not be user 7).
     */
    private function providerId(SocialUser $social): string
    {
        return "{$social->getId()}";
    }
}
