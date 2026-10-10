<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Facades\Lang;
use RuntimeException;

/**
 * Something cannot be saved because the plan's cap is reached. The message is written for the person who sees it.
 */
final class StashLimitReached extends RuntimeException
{
    public static function stashes(int $cap): self
    {
        return new self(Lang::string('You have reached the limit of :count stashes on your plan.', [
            'count' => number_format($cap),
        ]));
    }

    public static function storage(): self
    {
        return new self(Lang::string('You have used all the storage on your plan.'));
    }
}
