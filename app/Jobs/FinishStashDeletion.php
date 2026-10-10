<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Actions\Stashes\DeleteStash;
use App\Models\Stash;
use App\Stashes\PendingDeletion;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Ends a deletion the user started in the app once the undo window has passed. If the user undid it meanwhile
 * the job finds nothing pending and does nothing.
 */
final class FinishStashDeletion implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly int $stashId,
        public readonly int $userId,
    ) {
        $this->onQueue('maintenance');
    }

    public function handle(PendingDeletion $pending, DeleteStash $delete): void
    {
        if (! $pending->isPending($this->stashId)) {
            return;
        }

        $stash = Stash::query()->where('user_id', $this->userId)->find($this->stashId);

        if ($stash !== null) {
            $delete->delete($stash);
        }

        $pending->forget($this->stashId);
    }
}
