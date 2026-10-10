<?php

declare(strict_types=1);

namespace App\Auth;

use App\Models\Invitation;
use Illuminate\Support\Str;

/**
 * The codes that let people register while registration is by invitation.
 */
final class Invitations
{
    /**
     * Makes a code, to be handed to one person. Locked to an address when one is given.
     */
    public function create(?string $email = null, ?int $days = null): Invitation
    {
        return Invitation::query()->create([
            'code' => Str::random(32),
            'email' => $email === null ? null : Str::lower($email),
            'expires_at' => $days === null ? null : now()->addDays($days),
        ]);
    }

    /**
     * The invitation behind a code, locked for the rest of the transaction so that two sign-ups cannot use it.
     *
     * @throws RegistrationRefused
     */
    public function usable(?string $code, string $email): Invitation
    {
        if ($code === null || $code === '') {
            throw RegistrationRefused::needsInvitation();
        }

        $invitation = Invitation::query()->where('code', $code)->lockForUpdate()->first();

        if (
            $invitation === null ||
            ! $invitation->isUsable() ||
            $invitation->email !== null && $invitation->email !== Str::lower($email)
        ) {
            throw RegistrationRefused::invalidInvitation();
        }

        return $invitation;
    }
}
