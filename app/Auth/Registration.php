<?php

declare(strict_types=1);

namespace App\Auth;

use App\Enums\RegistrationMode;
use App\Models\User;
use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Facades\DB;

/**
 * Who may register (STASHLIST_REGISTRATION): anyone, only people with an invitation, or nobody. Closed is not
 * locked out of a new installation: while there is no user yet, the first account may be made, or nobody could
 * ever sign in to invite anyone.
 *
 * An invitation code travels in the session from the registration page, so a sign-up through GitHub or Google
 * (which leaves the site and comes back) can use it too.
 */
final class Registration
{
    private const SESSION_KEY = 'stashlist.invitation';

    public function __construct(
        private readonly Session $session,
        private readonly Invitations $invitations,
    ) {}

    public function mode(): RegistrationMode
    {
        return RegistrationMode::tryFrom(config()->string('stashlist.registration')) ?? RegistrationMode::Closed;
    }

    /**
     * Whether the registration form can be used at all, for the page to show it or a message.
     */
    public function isAccepting(): bool
    {
        return $this->mode() !== RegistrationMode::Closed || ! User::query()->exists();
    }

    /**
     * Keeps a code given in the address for the sign-up that follows.
     */
    public function remember(?string $code): void
    {
        if ($code !== null && $code !== '') {
            $this->session->put(self::SESSION_KEY, $code);
        }
    }

    public function remembered(): ?string
    {
        $code = (string)$this->session->get(self::SESSION_KEY, '');

        return $code === '' ? null : $code;
    }

    /**
     * Makes an account, if the mode and the invitation allow it. The invitation is used up in the same
     * transaction, so a code cannot let two people in.
     *
     * @param  callable(): User  $create  makes the user
     *
     * @throws RegistrationRefused
     */
    public function register(string $email, ?string $code, callable $create): User
    {
        $mode = $this->mode();

        if ($mode === RegistrationMode::Open || ! User::query()->exists() && $mode !== RegistrationMode::Invite) {
            return $create();
        }

        if ($mode === RegistrationMode::Closed) {
            throw RegistrationRefused::closed();
        }

        /** @var User $user */
        $user = DB::transaction(function () use ($email, $code, $create): User {
            $invitation = $this->invitations->usable($code ?? $this->remembered(), $email);
            $user = $create();

            $invitation->forceFill(['used_by' => $user->id, 'used_at' => now()])->save();

            return $user;
        });

        $this->session->forget(self::SESSION_KEY);

        return $user;
    }
}
