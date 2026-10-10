<?php

declare(strict_types=1);

namespace App\Data;

use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * A dominant color of an image and its share of the pixels (0 to 1).
 */
#[TypeScript]
final readonly class ColorData
{
    public function __construct(
        public string $hex,
        public float $pct,
    ) {}
}
