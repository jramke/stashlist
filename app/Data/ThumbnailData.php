<?php

declare(strict_types=1);

namespace App\Data;

use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * A signed image URL with the size it will have, so the grid can reserve space before it loads.
 */
#[TypeScript]
final readonly class ThumbnailData
{
    public function __construct(
        public string $url,
        public ?int $width,
        public ?int $height,
    ) {}
}
