<?php

declare(strict_types=1);

namespace App\Highlights;

use Illuminate\Support\Facades\Lang;
use RuntimeException;

/**
 * A stash or an account holds as many highlights as are allowed. The message is for the person.
 */
final class HighlightLimitReached extends RuntimeException
{
    public static function forStash(): self
    {
        return new self(Lang::string('This page has as many highlights as are allowed.'));
    }

    public static function forUser(): self
    {
        return new self(Lang::string('You have as many highlights as are allowed.'));
    }
}
