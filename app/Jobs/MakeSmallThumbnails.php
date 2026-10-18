<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\FileRole;
use App\Images\ImageProcessor;
use App\Images\InvalidImage;
use App\Models\Stash;
use App\Storage\StashStorage;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use RuntimeException;

/**
 * Makes the small thumbnail of a batch of stashes whose picture was processed before it existed
 * (`stashlist:small-thumbs`). It is made from the stored thumbnail, so the original is never read. A thumbnail
 * that cannot be read or found leaves its card on the big picture, which is what it had.
 */
final class MakeSmallThumbnails implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /**
     * @param  list<int>  $stashIds
     */
    public function __construct(
        public readonly array $stashIds,
    ) {
        $this->onQueue('maintenance');
    }

    public function handle(ImageProcessor $processor, StashStorage $storage): void
    {
        foreach (Stash::query()->whereKey($this->stashIds)->with(['thumbnail', 'thumbnailSmall'])->get() as $stash) {
            $thumbnail = $stash->thumbnail;

            if ($thumbnail === null || $stash->thumbnailSmall !== null) {
                continue;
            }

            try {
                $small = $processor->smallFrom($storage->contents($thumbnail));
            } catch (InvalidImage|RuntimeException) {
                continue;
            }

            if ($small !== null) {
                $storage->store($stash, FileRole::ThumbSmall, $small);
            }
        }
    }
}
