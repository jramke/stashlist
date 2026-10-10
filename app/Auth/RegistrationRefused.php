<?php

declare(strict_types=1);

namespace App\Auth;

use Illuminate\Support\Facades\Lang;
use RuntimeException;

/**
 * An account that may not be created. The message is written for the person who sees it.
 */
final class RegistrationRefused extends RuntimeException
{
    public static function closed(): self
    {
        return new self(Lang::string('Registration is closed.'));
    }

    public static function needsInvitation(): self
    {
        return new self(Lang::string('You need an invitation to register.'));
    }

    public static function invalidInvitation(): self
    {
        return new self(Lang::string('This invitation is not valid. It may have been used or have expired.'));
    }
}
