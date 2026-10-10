<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\AiStatus;
use App\Models\Stash;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\WithoutOverlapping;

/**
 * Last pipeline stage: put the stash, with everything the pipeline learned about it, into the search index
 * and note when. A stash the AI stage worked on is "done" now. The index is a projection of the database, so running this again is always safe.
 *
 * Saving a stash already queues an index write; this one exists because the enrichment (page text, later the
 * summary and tags) changes without the stash row changing.
 */
final class IndexStash implements ShouldQueue
{
    use Queueable;

    public int $timeout = 90;

    /** The search server being down or busy is the usual failure; it passes. */
    public int $tries = 5;

    public function __construct(
        public readonly int $stashId,
        public readonly int $userId,
    ) {
        $this->onQueue('index');
    }

    /**
     * @return list<WithoutOverlapping>
     */
    public function middleware(): array
    {
        return [new WithoutOverlapping("stash:{$this->stashId}")->releaseAfter(30)];
    }

    /**
     * @return list<int> seconds to wait before attempt 2, 3, 4 and 5
     */
    public function backoff(): array
    {
        return [10, 30, 120, 600];
    }

    public function handle(): void
    {
        $stash = Stash::query()->where('user_id', $this->userId)->with(Stash::SEARCH_RELATIONS)->find($this->stashId);

        // Deleted meanwhile: the observer removed it from the index.
        if ($stash === null) {
            return;
        }

        // Calling the engine directly skips makeSearchableUsing(), which is why the relations are loaded above.
        $stash->searchableUsing()->update($stash->newCollection([$stash]));

        // indexed_at is bookkeeping: it must not change updated_at, which is part of the indexed document.
        // The stage before this one leaves the stash "processing"; having made it to the index, it is done.
        Stash::withoutTimestamps(static function () use ($stash): void {
            $stash->forceFill(['indexed_at' => now()]);

            if ($stash->ai_status === AiStatus::Processing) {
                $stash->forceFill(['ai_status' => AiStatus::Done, 'ai_stage' => null, 'processed_at' => now()]);
            }

            $stash->saveQuietly();
        });
    }
}
