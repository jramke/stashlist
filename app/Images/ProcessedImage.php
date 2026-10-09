<?php

declare(strict_types=1);

namespace App\Images;

use App\Storage\Blob;

/**
 * The result of ImageProcessor: derivatives ready for StashStorage, the size of the original and its colors.
 */
final readonly class ProcessedImage
{
    /**
     * @param  list<array{hex: string, pct: float}>  $colors  up to five, most present first
     */
    public function __construct(
        public string $mime,
        public int $width,
        public int $height,
        public Blob $thumb,
        public Blob $preview,
        public array $colors,
    ) {}
}
