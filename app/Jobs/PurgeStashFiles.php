<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Storage\StashStorage;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Deletes every stored object of a stash after the stash itself is gone. Retried with backoff, because the
 * storage may be unreachable for a while; a monthly sweep catches whatever still slips through.
 */
final class PurgeStashFiles implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public function __construct(
        public readonly int $userId,
        public readonly int $stashId,
    ) {
        $this->onQueue('maintenance');
    }

    /**
     * @return list<int> seconds to wait before attempt 2 to 5
     */
    public function backoff(): array
    {
        return [10, 60, 300, 900];
    }

    public function handle(StashStorage $storage): void
    {
        $storage->purgeStash($this->userId, $this->stashId);
    }
}
