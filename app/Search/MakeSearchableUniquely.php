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
    public function uniqueId(): string
    {
        $first = $this->models->first();

        return 'scout:'.($first === null ? '' : $first::class).':'.md5(implode(',', $this->models->modelKeys()));
    }
}
