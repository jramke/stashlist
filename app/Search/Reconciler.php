<?php

declare(strict_types=1);

namespace App\Search;

use App\Models\Stash;
use Meilisearch\Client;
use Meilisearch\Contracts\DocumentsQuery;
use Meilisearch\Contracts\TasksQuery;
use Meilisearch\Endpoints\Indexes;

/**
 * Compares the search index with the database, which is the truth: a document without a stash (a ghost, from a
 * delete that was lost) is removed, a stash without a document (an index write that failed) is queued again,
 * and the tasks the engine accepted but later failed are listed, because it accepts a write first and may
 * reject it afterwards.
 */
final class Reconciler
{
    private const PAGE = 1000;

    public function __construct(
        private readonly Client $engine,
    ) {}

    /**
     * Reports what is out of step and changes nothing.
     */
    public function inspect(): ReconcileReport
    {
        $uid = new Stash()->searchableAs();
        $index = $this->engine->index($uid);

        return new ReconcileReport($this->ghosts($index), $this->missing($index), $this->failedTasks($uid));
    }

    /**
     * Puts it right: ghosts are deleted from the index and missing stashes are queued for indexing.
     */
    public function repair(): ReconcileReport
    {
        $report = $this->inspect();

        if ($report->ghosts !== []) {
            $this->engine->index(new Stash()->searchableAs())->deleteDocuments($report->ghosts);
        }

        Stash::reindex($report->missing);

        return $report;
    }

    /**
     * @return list<int> ids in the index that no stash has
     */
    private function ghosts(Indexes $index): array
    {
        $ghosts = [];
        $offset = 0;

        do {
            $ids = $this->idsOf(
                $index,
                new DocumentsQuery()
                    ->setFields(['id'])
                    ->setLimit(self::PAGE)
                    ->setOffset($offset),
            );
            $ghosts = [...$ghosts, ...array_diff($ids, $this->existing($ids))];
            $offset += self::PAGE;
        } while (count($ids) === self::PAGE);

        return array_values($ghosts);
    }

    /**
     * @return list<int> ids of stashes the index does not have
     */
    private function missing(Indexes $index): array
    {
        $missing = [];

        Stash::query()
            ->select('id')
            ->chunkById(self::PAGE, function ($stashes) use ($index, &$missing): void {
                $ids = array_values(array_map(intval(...), $stashes->pluck('id')->all()));
                $indexed = $this->idsOf(
                    $index,
                    new DocumentsQuery()
                        ->setFields(['id'])
                        ->setLimit(self::PAGE)
                        ->setFilter(['id IN ['.implode(',', $ids).']']),
                );

                $missing = [...$missing, ...array_diff($ids, $indexed)];
            });

        return array_values($missing);
    }

    /**
     * @return list<int>
     */
    private function idsOf(Indexes $index, DocumentsQuery $query): array
    {
        /** @var list<array{id: int|string}> $documents */
        $documents = $index->getDocuments($query)->getResults();

        return array_values(array_map(static fn (array $document): int => (int)$document['id'], $documents));
    }

    /**
     * @param  list<int>  $ids
     * @return list<int>
     */
    private function existing(array $ids): array
    {
        return array_values(array_map(
            intval(...),
            Stash::query()->withoutGlobalScopes()->whereKey($ids)->pluck('id')->all(),
        ));
    }

    /**
     * @return list<string> the engine's own words for why each task failed
     */
    private function failedTasks(string $indexUid): array
    {
        /** @var list<array{type: string, error?: array{message?: string}}> $tasks */
        $tasks = $this->engine
            ->getTasks(
                new TasksQuery()
                    ->setIndexUids([$indexUid])
                    ->setStatuses(['failed'])
                    ->setLimit(20),
            )
            ->getResults();

        return array_values(array_map(
            static fn (array $task): string => $task['type'].': '.($task['error']['message'] ?? 'no reason given'),
            $tasks,
        ));
    }
}
