<?php

declare(strict_types=1);

namespace App\Enums;

use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Who may create an account (STASHLIST_REGISTRATION).
 */
#[TypeScript]
enum RegistrationMode: string
{
    /** Nobody new, except the very first account of a new installation. */
    case Closed = 'closed';

    /** Whoever has an invitation code. */
    case Invite = 'invite';

    /** Anyone. */
    case Open = 'open';
}
