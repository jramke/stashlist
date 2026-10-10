<?php

declare(strict_types=1);

namespace App\Pipeline;

use App\Ai\AiGuard;
use App\Ai\Embedding\Embedders;
use App\Enums\AiStatus;
use App\Jobs\GenerateEmbedding;
use App\Jobs\IndexStash;
use App\Models\Stash;
use Illuminate\Support\Facades\Cache;

/**
 * A tag or a highlight changes the text a stash is embedded as, so its vector is made again, soon but not at once:
 * someone adding five tags in a row costs one embedding, not five. The first change schedules a job a little
 * later and the changes that follow within the minute ride on it, because the job reads the stash when it runs.
 * No language model is involved, so this costs a fraction of a cent.
 *
 * A stash that is still in the pipeline is left alone (its own chain makes the vector), and so is one whose
 * owner has smart features off.
 */
final class RefreshEmbedding
{
    /** Seconds the job waits, which is also how long a stash is not scheduled again. */
    private const DELAY = 45;

    public function __construct(
        private readonly AiGuard $guard,
        private readonly Embedders $embedders,
    ) {}

    /**
     * @param  list<int>  $stashIds
     */
    public function schedule(array $stashIds): void
    {
        if ($stashIds === [] || ! array_any($this->embedders->all(), $this->guard->canEmbed(...))) {
            return;
        }

        $stashes = Stash::query()
            ->whereKey($stashIds)
            ->where('ai_status', AiStatus::Done->value)
            ->get(['id', 'user_id', 'ai_status']);

        foreach ($stashes as $stash) {
            if (
                ! $this->guard->allows($stash) || ! Cache::add("embedding-refresh:{$stash->id}", true, self::DELAY + 15)
            ) {
                continue;
            }

            dispatch(
                new GenerateEmbedding($stash->id, $stash->user_id)
                    ->delay(self::DELAY)
                    ->chain([new IndexStash($stash->id, $stash->user_id)]),
            );
        }
    }
}
