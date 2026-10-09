<?php

declare(strict_types=1);

namespace App\Actions\Stashes;

use App\Jobs\PurgeStashFiles;
use App\Models\Stash;
use App\Tags\TagSync;
use Illuminate\Support\Facades\DB;

/**
 * Deletes a stash for real: no soft delete, no trash. The row goes in one transaction and the database
 * cascades to the enrichment, file rows, tag and collection links. Once that has committed, the stored
 * objects are removed by a queued job. The search index is cleaned by Scout's model observer.
 */
final readonly class DeleteStash
{
    public function __construct(
        private TagSync $tags,
    ) {}

    public function delete(Stash $stash): void
    {
        $userId = $stash->user_id;
        $stashId = $stash->id;

        DB::transaction(function () use ($stash, $userId, $stashId): void {
            $tagIds = $stash
                ->tags()
                ->pluck('tags.id')
                ->map(static fn (mixed $id): int => (int)$id)
                ->values()
                ->all();

            $stash->delete();

            // The cascade removed the links but not the counters on the tags.
            $this->tags->recountTags($userId, $tagIds);

            dispatch(new PurgeStashFiles($userId, $stashId)->afterCommit());
        });
    }
}
