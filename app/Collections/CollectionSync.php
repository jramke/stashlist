<?php

declare(strict_types=1);

namespace App\Collections;

use App\Models\Collection;
use App\Models\Stash;

/**
 * Puts stashes into a user's collections. A stash can be in many collections; links and rows always carry the
 * owner (composite foreign keys), so a stash can never end up in someone else's collection. Ids that are not
 * the owner's are ignored everywhere.
 */
final class CollectionSync
{
    /**
     * Adds the stash to the given collections; a stash that is in a collection already stays where it is.
     *
     * @param  list<int>  $collectionIds
     */
    public function add(Stash $stash, array $collectionIds): void
    {
        if ($collectionIds === []) {
            return;
        }

        $stash->collections()->syncWithoutDetaching($this->memberships($stash, $collectionIds));
    }

    /**
     * Makes the stash a member of exactly these collections.
     *
     * @param  list<int>  $collectionIds
     */
    public function syncCollections(Stash $stash, array $collectionIds): void
    {
        $stash->collections()->sync($this->memberships($stash, $collectionIds));
    }

    /**
     * Makes the collection hold exactly these stashes, in this order: the position follows the list.
     *
     * @param  list<int>  $stashIds
     */
    public function syncStashes(Collection $collection, array $stashIds): void
    {
        $owned = array_map(
            intval(...),
            Stash::query()->where('user_id', $collection->user_id)->whereIn('id', $stashIds)->pluck('id')->all(),
        );
        $members = array_map(intval(...), $collection->stashes()->pluck('stashes.id')->all());

        $ordered = array_values(array_filter($stashIds, static fn (int $id): bool => in_array(
            $id,
            $owned,
            strict: true,
        )));

        $collection->stashes()->detach(array_values(array_diff($members, $ordered)));

        foreach ($ordered as $position => $stashId) {
            if (in_array($stashId, $members, strict: true)) {
                $collection->stashes()->updateExistingPivot($stashId, ['position' => $position]);

                continue;
            }

            $collection->stashes()->attach($stashId, [
                'user_id' => $collection->user_id,
                'position' => $position,
                'created_at' => now(),
            ]);
        }
    }

    /**
     * The pivot rows for the owner's collections among the given ids.
     *
     * @param  list<int>  $collectionIds
     * @return array<int, array{user_id: int, created_at: \Carbon\CarbonInterface}>
     */
    private function memberships(Stash $stash, array $collectionIds): array
    {
        $owned = array_map(
            intval(...),
            Collection::query()->where('user_id', $stash->user_id)->whereIn('id', $collectionIds)->pluck('id')->all(),
        );

        $memberships = [];

        foreach ($owned as $id) {
            $memberships[$id] = ['user_id' => $stash->user_id, 'created_at' => now()];
        }

        return $memberships;
    }
}
