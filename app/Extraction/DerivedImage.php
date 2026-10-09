<?php

declare(strict_types=1);

namespace App\Extraction;

/**
 * The facts about an image that was stored: for stashes.meta and the enrichment's colors.
 */
final readonly class DerivedImage
{
    /**
     * @param  array{width: int, height: int, mime: string, bytes: int}  $meta
     * @param  list<array{hex: string, pct: float}>  $colors
     */
    public function __construct(
        public array $meta,
        public array $colors,
    ) {}
}
