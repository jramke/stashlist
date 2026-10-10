<?php

declare(strict_types=1);

namespace App\Search;

/**
 * The part of the search index that belongs to one user, as a whole: removing it when the account goes, and
 * counting what is left to prove that it is gone.
 */
interface UserIndex
{
    /**
     * Deletes every document of the user. The engine takes the request and applies it a moment later.
     */
    public function purge(int $userId): void;

    /**
     * How many documents of the user the engine holds, once the writes sent so far are applied.
     */
    public function count(int $userId): int;
}
