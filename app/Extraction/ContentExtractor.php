<?php

declare(strict_types=1);

namespace App\Extraction;

use App\Enums\FileRole;
use App\Enums\StashType;
use App\Images\InvalidImage;
use App\Models\Stash;
use App\Storage\StashStorage;

/**
 * Extraction step of the pipeline: looks at what a stash points to and returns what it found. Only links and
 * images have anything to extract; notes and colors are complete as they are.
 */
final readonly class ContentExtractor
{
    private const IMAGE_LIMIT = 10 * 1024 * 1024;

    public function __construct(
        private LinkExtractor $links,
        private ImageExtractor $images,
        private SafeHttp $http,
        private StashStorage $storage,
    ) {}

    /**
     * @param  string|null  $previousHash  the extract_hash of the last run; fetching the same content again
     *                                     changes nothing
     * @return ExtractionResult|null null when there is nothing to do or nothing changed
     *
     * @throws BlockedUrl
     * @throws FetchFailed
     * @throws InvalidImage
     */
    public function extract(Stash $stash, ?string $previousHash): ?ExtractionResult
    {
        return match ($stash->type) {
            StashType::Link => $this->links->extract($stash, $previousHash),
            StashType::Image => $this->image($stash, $previousHash),
            default => null,
        };
    }

    /**
     * An image stash holds its original already (an upload) or points at an image URL.
     *
     * @throws BlockedUrl
     * @throws FetchFailed
     * @throws InvalidImage
     */
    private function image(Stash $stash, ?string $previousHash): ?ExtractionResult
    {
        $original = $stash->files()->where('role', FileRole::Original->value)->first();

        $bytes = $original !== null
            ? $this->storage->contents($original)
            : $this->http->get((string)$stash->url, ['image/*' => self::IMAGE_LIMIT])->body;

        $hash = hash(algo: 'sha256', data: $bytes);

        if ($hash === $previousHash) {
            return null;
        }

        $image = $this->images->derive($stash, $bytes, keepAs: $original === null ? FileRole::Original : null);

        return new ExtractionResult(hash: $hash, meta: $image->meta, colors: $image->colors);
    }
}
