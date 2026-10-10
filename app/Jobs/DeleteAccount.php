<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Stash;
use App\Models\User;
use App\Search\UserIndex;
use App\Storage\StashStorage;
use DateTimeInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Removes an account and everything of it, in the order that leaves nothing behind if it stops halfway:
 *
 *  1. the search documents, 2. the stored files, 3. the rows (stashes in chunks, the user last), 4. a check.
 *
 * Every step can be repeated, so a job that failed in the middle starts over from the top (tried for three
 * days). The person is locked out from the moment `deleting_at` is set, before this job runs. Backups keep the
 * data until they rotate; the privacy page says so. Only the user id is logged.
 */
final class DeleteAccount implements ShouldQueue
{
    use Queueable;

    public int $timeout = 3600;

    /** Unlimited tries; retryUntil() is the limit. */
    public int $tries = 0;

    private const CHUNK = 1000;

    public function __construct(
        public readonly int $userId,
    ) {
        $this->onQueue('maintenance');
    }

    public function retryUntil(): DateTimeInterface
    {
        return now()->addDays(3);
    }

    /**
     * @return list<int>
     */
    public function backoff(): array
    {
        return [60, 300, 1800, 7200];
    }

    public function handle(UserIndex $index, StashStorage $storage): void
    {
        $user = User::query()->find($this->userId);

        // Done already, or never started: nothing to do. Only an account that was marked is ever removed.
        if ($user === null || $user->deleting_at === null) {
            return;
        }

        $user->tokens()->delete();
        $index->purge($this->userId);
        $storage->purgeUser($this->userId);

        do {
            $deleted = (int)Stash::query()->where('user_id', $this->userId)->limit(self::CHUNK)->delete();
        } while ($deleted === self::CHUNK);

        $this->removeTheRest($user);

        // The index may have been written to by a job that was already running.
        $index->purge($this->userId);

        if ($index->count($this->userId) !== 0) {
            throw new RuntimeException("Documents of user {$this->userId} are still in the search index.");
        }

        Log::info('An account was deleted.', ['user' => $this->userId]);
    }

    /**
     * What is left once the stashes are gone: tags, collections, usage and exports, then the user. The database
     * cascades do the files, links and logs.
     */
    private function removeTheRest(User $user): void
    {
        $user->tags()->delete();
        $user->collections()->delete();
        $user->delete();
    }
}
