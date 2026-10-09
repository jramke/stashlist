<?php

declare(strict_types=1);

namespace App\Storage;

/**
 * Bytes to store, with their media type and, for images, their size.
 */
final readonly class Blob
{
    public function __construct(
        public string $contents,
        public string $mime,
        public ?int $width = null,
        public ?int $height = null,
    ) {}
}
