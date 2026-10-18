<?php

declare(strict_types=1);

namespace App\Extraction;

use App\Enums\FileRole;
use App\Images\ImageProcessor;
use App\Images\InvalidImage;
use App\Models\Stash;
use App\Storage\Blob;
use App\Storage\StashStorage;

/**
 * Turns image bytes into stored derivatives for a stash: thumbnails and preview, optionally the source
 * itself, plus the facts that go into meta and colors.
 */
final readonly class ImageExtractor
{
    public function __construct(
        private ImageProcessor $processor,
        private StashStorage $storage,
    ) {}

    /**
     * @param  FileRole|null  $keepAs  store the source bytes under this role (null: they are stored already)
     *
     * @throws InvalidImage
     */
    public function derive(Stash $stash, string $bytes, ?FileRole $keepAs): DerivedImage
    {
        $processed = $this->processor->process($bytes);

        if ($keepAs !== null) {
            $this->storage->store(
                $stash,
                $keepAs,
                new Blob($bytes, $processed->mime, $processed->width, $processed->height),
            );
        }

        $this->storage->store($stash, FileRole::Thumb, $processed->thumb);
        $this->storeSmall($stash, $processed->thumbSmall);
        $this->storage->store($stash, FileRole::Preview, $processed->preview);

        return new DerivedImage(
            meta: [
                'width' => $processed->width,
                'height' => $processed->height,
                'mime' => $processed->mime,
                'bytes' => strlen($bytes),
            ],
            colors: $processed->colors,
        );
    }

    /**
     * The small thumbnail goes next to the big one. A picture too small to have one must not keep the small
     * thumbnail of the picture it replaces.
     */
    private function storeSmall(Stash $stash, ?Blob $small): void
    {
        if ($small !== null) {
            $this->storage->store($stash, FileRole::ThumbSmall, $small);

            return;
        }

        $old = $stash->files()->where('role', FileRole::ThumbSmall->value)->first();

        if ($old !== null) {
            $this->storage->forget($old);
        }
    }
}
