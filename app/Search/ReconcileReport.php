<?php

declare(strict_types=1);

namespace App\Search;

/**
 * What the reconciliation found.
 */
final readonly class ReconcileReport
{
    /**
     * @param  list<int>  $ghosts  ids in the index without a stash
     * @param  list<int>  $missing  stashes without a document
     * @param  list<string>  $failedTasks
     */
    public function __construct(
        public array $ghosts,
        public array $missing,
        public array $failedTasks,
    ) {}

    public function isClean(): bool
    {
        return $this->ghosts === [] && $this->missing === [] && $this->failedTasks === [];
    }
}
