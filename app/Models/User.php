<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property CarbonImmutable|null $email_verified_at
 * @property string|null $password null for accounts that only sign in with GitHub or Google
 * @property string $locale UI language only; tags and summaries follow each stash's own language
 * @property bool $ai_enabled account-wide switch for future work; existing AI data is left alone
 * @property string $plan key of config('stashlist.plans')
 * @property CarbonImmutable|null $deleting_at set when account deletion starts, blocks login
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property CarbonImmutable|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Whether this account may open Horizon and Pulse: its email is on the STASHLIST_ADMINS list and verified.
     * Registering with a password proves nothing about the address, so an unverified one never counts (an
     * admin signs in with GitHub or Google, whose emails are verified).
     */
    public function isAdmin(): bool
    {
        return (
            $this->email_verified_at !== null &&
            in_array(mb_strtolower($this->email), config()->array('stashlist.admins'), strict: true)
        );
    }

    /**
     * @return HasMany<Stash, $this>
     */
    public function stashes(): HasMany
    {
        return $this->hasMany(Stash::class);
    }

    /**
     * @return HasMany<Tag, $this>
     */
    public function tags(): HasMany
    {
        return $this->hasMany(Tag::class);
    }

    /**
     * @return HasMany<Collection, $this>
     */
    public function collections(): HasMany
    {
        return $this->hasMany(Collection::class);
    }

    /**
     * @return HasMany<OAuthAccount, $this>
     */
    public function oauthAccounts(): HasMany
    {
        return $this->hasMany(OAuthAccount::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            // @mago-expect lint:no-literal-password
            'password' => 'hashed',
            'ai_enabled' => 'boolean',
            'deleting_at' => 'datetime',
        ];
    }
}
