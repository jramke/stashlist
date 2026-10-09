<?php

declare(strict_types=1);

namespace App\Extraction;

/**
 * What a fetched HTML page says about itself. Every field is optional: pages are often poor.
 */
final readonly class ParsedPage
{
    public function __construct(
        public ?string $title = null,
        public ?string $description = null,
        public ?string $siteName = null,
        public ?string $imageUrl = null,
        public ?string $faviconUrl = null,
        public ?string $language = null,
        public ?string $openGraphType = null,
        public ?string $text = null,
    ) {}
}
