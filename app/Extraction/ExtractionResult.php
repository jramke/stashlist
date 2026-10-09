<?php

declare(strict_types=1);

namespace App\Extraction;

use App\Enums\StashType;

/**
 * What extraction learned about a stash, ready to be written by the ExtractContent job. The files it
 * produced (thumbnails, previews, originals) are already stored.
 */
final readonly class ExtractionResult
{
    /**
     * @param  array<string, mixed>  $meta  merged into stashes.meta
     * @param  list<array{hex: string, pct: float}>|null  $colors
     */
    public function __construct(
        public string $hash,
        public ?StashType $type = null,
        public ?string $subtype = null,
        public array $meta = [],
        public ?string $title = null,
        public ?string $description = null,
        public ?string $text = null,
        public ?array $colors = null,
    ) {}
}
