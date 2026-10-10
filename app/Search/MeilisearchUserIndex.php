<?php

declare(strict_types=1);

namespace App\Search;

use App\Models\Stash;
use Meilisearch\Client;

/**
 * The user's part of the search index in Meilisearch.
 */
final class MeilisearchUserIndex implements UserIndex
{
    public function __construct(
        private readonly Client $engine,
    ) {}

    /**
     * Deletes every document of the user. The engine takes the request and applies it a moment later.
     */
    public function purge(int $userId): void
    {
        $this->engine->index(new Stash()->searchableAs())->deleteDocuments(['filter' => "user_id = {$userId}"]);
    }

    /**
     * How many documents of the user the engine holds, once the writes sent so far are applied.
     */
    public function count(int $userId): int
    {
        $index = $this->engine->index(new Stash()->searchableAs());

        $this->settle();

        return (int)$index->search('', ['filter' => "user_id = {$userId}", 'limit' => 0])->getEstimatedTotalHits();
    }

    /**
     * Index writes are accepted at once and applied later; a count is only true after they are.
     */
    private function settle(): void
    {
        $uid = new Stash()->searchableAs();

        for ($try = 0; $try < 60; $try++) {
            $waiting = $this->engine->getTasks(
                new \Meilisearch\Contracts\TasksQuery()->setIndexUids([$uid])->setStatuses(['enqueued', 'processing']),
            );

            if ($waiting->getTotal() === 0) {
                return;
            }

            usleep(microseconds: 250_000);
        }
    }
}
