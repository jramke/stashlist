<?php

declare(strict_types=1);

namespace App\Search;

use Illuminate\Contracts\Queue\ShouldBeUniqueUntilProcessing;
use Laravel\Scout\Jobs\MakeSearchable;

/**
 * Scout's indexing job, made unique until it starts: several quick saves of one stash (a title, then a tag,
 * then the extraction) wait in the queue as one job, because the job reloads the models when it runs. A save
 * that arrives while the job runs queues a new one, so nothing is lost.
 */
final class MakeSearchableUniquely extends MakeSearchable implements ShouldBeUniqueUntilProcessing
{
    /**
     * Seconds the lock lasts at most. The lock is taken when the job is dispatched, but a dispatch inside a
     * transaction only reaches the queue after the commit; if the transaction rolls back, no job ever
     * releases the lock, and without an end the stash could not be indexed again.
     */
    public int $uniqueFor = 60;

    public function uniqueId(): string
    {
        $first = $this->models->first();

        return 'scout:'.($first === null ? '' : $first::class).':'.md5(implode(',', $this->models->modelKeys()));
    }
}
