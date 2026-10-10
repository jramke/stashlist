<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Auth\Invitations;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature(
    'stashlist:invite {email? : Only this address may use the invitation} {--days=14 : How long it stays valid}',
)]
#[Description('Make an invitation link for STASHLIST_REGISTRATION=invite')]
final class InviteSomeone extends Command
{
    public function handle(Invitations $invitations): int
    {
        $email = $this->argument('email');
        $days = $this->option('days');

        $invitation = $invitations->create(
            is_string($email) && $email !== '' ? $email : null,
            is_scalar($days) ? max(1, (int)$days) : 14,
        );

        $this->components->info('Send this link to the person you are inviting:');
        $this->line(url('/register?invite='.$invitation->code));

        return self::SUCCESS;
    }
}
