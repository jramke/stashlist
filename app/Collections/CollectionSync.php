<?php

declare(strict_types=1);

namespace App\Collections;

use App\Models\Collection;
use App\Models\Stash;

/**
 * Puts stashes into a user's collections. A stash can be in many collections; links and rows always carry the
 * owner (composite foreign keys), so a stash can never end up in someone else's collection.
 */
final class CollectionSync
{
    /**
     * Adds the stash to the given collections of its owner. Ids that are not the owner's are ignored, and a
     * stash that is in a collection already stays where it is.
     *
     * @param  list<int>  $collectionIds
     */
    public function add(Stash $stash, array $collectionIds): void
    {
        if ($collectionIds === []) {
            return;
        }

        $owned = Collection::query()->where('user_id', $stash->user_id)->whereIn('id', $collectionIds)->pluck('id');

        $stash
            ->collections()
            ->syncWithoutDetaching(
                $owned->mapWithKeys(static fn (int $id): array => [$id => [
                    'user_id' => $stash->user_id,
                    'created_at' => now(),
                ]])->all(),
            );
    }
}
