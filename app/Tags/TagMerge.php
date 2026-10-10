<?php

declare(strict_types=1);

namespace App\Tags;

use App\Enums\TagSource;
use App\Models\Stash;
use App\Models\Tag;
use App\Pipeline\RefreshEmbedding;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Folds one tag into another of the same user: every stash that has the first gets the second, and the first is
 * gone. Where a stash has both, the rows are combined so that nothing the user decided is lost: a tag the user put
 * on stays theirs, and a tag that is visible on either side is visible after.
 *
 * Like TagSync, a writer of stash_tag rows (the architecture test allows the whole Tags namespace).
 */
final class TagMerge
{
    public function __construct(
        private readonly TagSync $tags,
        private readonly RefreshEmbedding $embeddings,
    ) {}

    /**
     * @throws InvalidArgumentException when the tags are the same, or belong to different users
     */
    public function merge(Tag $from, Tag $into): Tag
    {
        if ($from->is($into) || $from->user_id !== $into->user_id) {
            throw new InvalidArgumentException('A tag can only be merged into another tag of the same user.');
        }

        $stashIds = [];

        DB::transaction(function () use ($from, $into, &$stashIds): void {
            $carriers = Stash::query()
                ->where('user_id', $from->user_id)
                ->whereHas('tags', static fn ($tags) => $tags->where('tags.id', $from->id))
                ->get();

            foreach ($carriers as $stash) {
                $this->fold($stash, $from, $into);
                $stashIds[] = $stash->id;
            }

            $from->delete();
        });

        $this->tags->recountTags($into->user_id, [$into->id]);
        Stash::reindex($stashIds);
        $this->embeddings->schedule($stashIds);

        return $into->refresh();
    }

    private function fold(Stash $stash, Tag $from, Tag $into): void
    {
        $old = $this->pivotOf($stash, $from->id) ?? throw new InvalidArgumentException(
            'The stash does not have the tag.',
        );
        $kept = $this->pivotOf($stash, $into->id);

        if ($kept === null) {
            $stash->tags()->attach($into->id, [
                'user_id' => $stash->user_id,
                'source' => $old->getAttribute('source'),
                'dismissed_at' => $old->getAttribute('dismissed_at'),
                'created_at' => $old->getAttribute('created_at'),
            ]);
        }

        if ($kept !== null) {
            $this->combine($stash, $into, $old, $kept);
        }

        $stash->tags()->detach($from->id);
    }

    private function pivotOf(Stash $stash, int $tagId): ?Pivot
    {
        $tag = $stash->tags()->where('tags.id', $tagId)->first();

        if ($tag === null) {
            return null;
        }

        /** @var Pivot */
        return $tag->getRelation('pivot');
    }

    /**
     * The user wins over the machine, and visible wins over dismissed.
     */
    private function combine(Stash $stash, Tag $into, Pivot $old, Pivot $kept): void
    {
        $byUser =
            $old->getAttribute('source') === TagSource::User->value ||
            $kept->getAttribute('source') === TagSource::User->value;
        $dismissed =
            ! $byUser && $old->getAttribute('dismissed_at') !== null && $kept->getAttribute('dismissed_at') !== null;

        $stash->tags()->updateExistingPivot($into->id, [
            'source' => $byUser ? TagSource::User->value : TagSource::Ai->value,
            'dismissed_at' => $dismissed ? $kept->getAttribute('dismissed_at') : null,
        ]);
    }
}
