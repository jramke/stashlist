<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\FileRole;
use App\Extraction\BlockedUrl;
use App\Extraction\DerivedImage;
use App\Extraction\FetchFailed;
use App\Extraction\ImageExtractor;
use App\Extraction\SafeHttp;
use App\Images\ColorBuckets;
use App\Images\InvalidImage;
use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Storage\StashStorage;
use Generator;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\WithoutOverlapping;

/**
 * Makes the thumbnails and preview of a stash from the picture its client captured, best first: the page's own
 * picture when the client sent its bytes; the page's own picture by the address the client sent (the browser
 * extension sends the address, not the bytes), fetched the safe way; a screenshot of what the client saw. A source
 * that cannot be fetched or is not a picture passes the turn to the next. The stash is complete without a
 * picture, so nothing here marks it as failed.
 */
final class DeriveCapturedImage implements ShouldQueue
{
    use Queueable;

    public int $timeout = 90;

    public int $tries = 3;

    private const IMAGE_LIMIT = 10 * 1024 * 1024;

    public function __construct(
        public readonly int $stashId,
        public readonly int $userId,
    ) {
        $this->onQueue('scrape');
    }

    /**
     * @return list<WithoutOverlapping>
     */
    public function middleware(): array
    {
        return [new WithoutOverlapping("stash:{$this->stashId}")->releaseAfter(30)];
    }

    /**
     * @return list<int>
     */
    public function backoff(): array
    {
        return [30, 120];
    }

    public function handle(ImageExtractor $images, SafeHttp $http, StashStorage $storage): void
    {
        $stash = Stash::query()->where('user_id', $this->userId)->find($this->stashId);

        if ($stash === null) {
            return;
        }

        $derived = null;

        foreach ($this->sources($stash, $http, $storage) as [$bytes, $keepAs]) {
            $derived = $this->derived($images, $stash, $bytes, $keepAs);

            if ($derived !== null) {
                break;
            }
        }

        if ($derived === null) {
            return;
        }

        StashEnrichment::query()->updateOrCreate(
            ['stash_id' => $stash->id],
            [
                'user_id' => $stash->user_id,
                'colors' => $derived->colors,
                // The color filter and the search read the names, so a picture the client sent is found by them too.
                'color_names' => ColorBuckets::values($derived->colors),
            ],
        );
    }

    /**
     * The picture made from some bytes, or null when they are not a picture: the next source may be.
     */
    private function derived(ImageExtractor $images, Stash $stash, string $bytes, ?FileRole $keepAs): ?DerivedImage
    {
        try {
            return $images->derive($stash, $bytes, keepAs: $keepAs);
        } catch (InvalidImage) {
            return null;
        }
    }

    /**
     * The bytes to make the picture from, best first, each with the role to keep them under (null: they are
     * stored already). Fetching waits until the sources before it have been tried.
     *
     * @return Generator<int, array{string, FileRole|null}>
     */
    private function sources(Stash $stash, SafeHttp $http, StashStorage $storage): Generator
    {
        $own = $this->stored($stash, $storage, FileRole::Og);

        if ($own !== null) {
            yield [$own, null];
        }

        $fetched = $this->fetched($stash, $http);

        if ($fetched !== null) {
            yield [$fetched, FileRole::Og];
        }

        $screenshot = $this->stored($stash, $storage, FileRole::Screenshot);

        if ($screenshot !== null) {
            yield [$screenshot, null];
        }
    }

    private function stored(Stash $stash, StashStorage $storage, FileRole $role): ?string
    {
        $file = $stash->files()->where('role', $role->value)->first();

        return $file === null ? null : $storage->contents($file);
    }

    /**
     * The picture at the address the client sent, or null when there is none or it cannot be had.
     */
    private function fetched(Stash $stash, SafeHttp $http): ?string
    {
        /** @var string|null $url */
        $url = $stash->meta['image_url'] ?? null;

        if (! is_string($url)) {
            return null;
        }

        try {
            return $http->get($url, ['image/*' => self::IMAGE_LIMIT])->body;
        } catch (BlockedUrl|FetchFailed) {
            return null;
        }
    }
}
