<?php

declare(strict_types=1);

namespace App\Stashes;

use App\Enums\AiStatus;
use App\Enums\StashType;
use App\Models\Stash;

/**
 * Whether a stash is still being filled in by the pipeline, which is what makes a card show a spinner and the
 * page ask again. Both stop waiting after a while, so a stopped queue does not leave a spinner running for good.
 */
final class Progress
{
    /**
     * Whether extraction is still expected to fill the stash in: links and images that have not been read yet
     * and have not failed. After ten minutes the card stops waiting.
     */
    public static function isFetching(Stash $stash): bool
    {
        $extractable = $stash->type === StashType::Link || $stash->type === StashType::Image;

        return (
            $extractable &&
            $stash->ai_status !== AiStatus::Failed &&
            ($stash->enrichment->extracted_at ?? null) === null &&
            $stash->created_at !== null &&
            $stash->created_at->isAfter(now()->subMinutes(10))
        );
    }

    /**
     * Whether the model is still expected to add a summary and tags: the stash is in the queue or being worked
     * on, and nothing says it is waiting for something else (the monthly cap, a paused provider). After fifteen
     * minutes the card stops waiting.
     */
    public static function isTagging(Stash $stash): bool
    {
        return (
            ($stash->ai_status === AiStatus::Pending || $stash->ai_status === AiStatus::Processing) &&
            $stash->ai_error === null &&
            $stash->updated_at !== null &&
            $stash->updated_at->isAfter(now()->subMinutes(15))
        );
    }
}
