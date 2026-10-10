<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\FileRole;
use App\Extraction\BlockedUrl;
use App\Extraction\FetchFailed;
use App\Extraction\ImageExtractor;
use App\Extraction\SafeHttp;
use App\Images\InvalidImage;
use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Storage\StashStorage;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\WithoutOverlapping;

/**
 * Makes the thumbnail and preview of a stash from the picture its client captured: the page's own picture, a
 * screenshot, or, when the client sent only an address, that address fetched the safe way. The stash is
 * complete without a picture, so nothing here marks it as failed.
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

        try {
            $source = $this->source($stash, $http, $storage);

            if ($source === null) {
                return;
            }

            [$bytes, $keepAs] = $source;
            $derived = $images->derive($stash, $bytes, keepAs: $keepAs);
        } catch (BlockedUrl|FetchFailed|InvalidImage) {
            return;
        }

        StashEnrichment::query()->updateOrCreate(
            ['stash_id' => $stash->id],
            ['user_id' => $stash->user_id, 'colors' => $derived->colors],
        );
    }

    /**
     * The bytes to make the picture from, and the role to keep them under (null: they are stored already).
     *
     * @return array{string, FileRole|null}|null
     *
     * @throws BlockedUrl
     * @throws FetchFailed
     */
    private function source(Stash $stash, SafeHttp $http, StashStorage $storage): ?array
    {
        $stored = $this->stored($stash, $storage);

        if ($stored !== null) {
            return [$stored, null];
        }

        $fetched = $this->fetched($stash, $http);

        return $fetched === null ? null : [$fetched, FileRole::Og];
    }

    /**
     * The picture the client sent: the page's own, else the screenshot.
     */
    private function stored(Stash $stash, StashStorage $storage): ?string
    {
        foreach ([FileRole::Og, FileRole::Screenshot] as $role) {
            $file = $stash->files()->where('role', $role->value)->first();

            if ($file !== null) {
                return $storage->contents($file);
            }
        }

        return null;
    }

    /**
     * @throws BlockedUrl
     * @throws FetchFailed
     */
    private function fetched(Stash $stash, SafeHttp $http): ?string
    {
        /** @var string|null $url */
        $url = $stash->meta['image_url'] ?? null;

        if (! is_string($url)) {
            return null;
        }

        return $http->get($url, ['image/*' => self::IMAGE_LIMIT])->body;
    }
}
