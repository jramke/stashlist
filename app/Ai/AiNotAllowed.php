<?php

declare(strict_types=1);

namespace App\Ai;

use RuntimeException;

/**
 * Thrown by AiGuard when a provider must not be called for a stash: the instance has AI off, or its owner
 * turned smart features off.
 */
final class AiNotAllowed extends RuntimeException
{
    public static function instanceHasAiOff(): self
    {
        return new self('AI is switched off on this instance.');
    }

    public static function userHasAiOff(int $userId): self
    {
        return new self("User {$userId} turned smart features off.");
    }
}
