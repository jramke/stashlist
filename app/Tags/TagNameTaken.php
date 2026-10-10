<?php

declare(strict_types=1);

namespace App\Tags;

use RuntimeException;

/**
 * Renaming a tag to a name another tag of the same user already has. Merging the two is a separate action.
 */
final class TagNameTaken extends RuntimeException
{
    public static function for(string $name): self
    {
        return new self("You already have a tag called {$name}.");
    }
}
