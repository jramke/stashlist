<?php

declare(strict_types=1);

namespace App\Stashes;

use App\Jobs\FinishStashDeletion;
use App\Models\Stash;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Deleting in the app has a short undo window: the stash is only marked, and a job deletes it for real ten
 * seconds later unless the user undid it. Deletion stays real (no trash); a lost cache entry fails safe,
 * because without the mark the job does nothing.
 */
final class PendingDeletion
{
    public const UNDO_SECONDS = 10;

    public function schedule(Stash $stash): void
    {
        Cache::put($this->key($stash->id), true, ttl: self::UNDO_SECONDS + 50);

        dispatch(new FinishStashDeletion($stash->id, $stash->user_id)->delay(self::UNDO_SECONDS));
    }

    public function cancel(Stash $stash): void
    {
        $this->forget($stash->id);
    }

    public function isPending(int $stashId): bool
    {
        return Cache::has($this->key($stashId));
    }

    /**
     * The stashes without those whose deletion is waiting out its undo window: to the user they are gone
     * already. One cache round trip for the whole list.
     *
     * @param  Collection<int, Stash>  $stashes
     * @return Collection<int, Stash>
     */
    public function without(Collection $stashes): Collection
    {
        $marks = Cache::many($stashes->map(fn (Stash $stash): string => $this->key($stash->id))->all());

        return $stashes->reject(fn (Stash $stash): bool => $marks[$this->key($stash->id)] !== null)->values();
    }

    public function forget(int $stashId): void
    {
        Cache::forget($this->key($stashId));
    }

    private function key(int $stashId): string
    {
        return "stash-deletion:{$stashId}";
    }
}
