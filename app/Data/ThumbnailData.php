<?php

declare(strict_types=1);

namespace App\Data;

use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * A signed image URL with the size it will have, so the grid can reserve space before it loads. `srcset` lists the
 * same picture in the sizes there are (`<url> <width>w, ...`) when there is more than one, so a screen takes the
 * smallest that is sharp enough.
 */
#[TypeScript]
final readonly class ThumbnailData
{
    public function __construct(
        public string $url,
        public ?int $width,
        public ?int $height,
        public ?string $srcset = null,
    ) {}
}
