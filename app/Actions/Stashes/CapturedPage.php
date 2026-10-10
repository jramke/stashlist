<?php

declare(strict_types=1);

namespace App\Actions\Stashes;

/**
 * What a client that has the page open tells us about it (the `capture` block of the API). It is input from
 * software we do not control: the request class has validated and cleaned it, and nothing here is ever
 * rendered as HTML.
 */
final readonly class CapturedPage
{
    /**
     * @param  array<array-key, mixed>  $schemaOrg  the page's JSON-LD, already size-capped
     */
    public function __construct(
        public ?string $source = null,
        public ?string $version = null,
        public ?string $contentMarkdown = null,
        public ?string $description = null,
        public ?string $siteName = null,
        public ?string $author = null,
        public ?string $published = null,
        public ?string $language = null,
        public ?string $faviconUrl = null,
        public ?string $imageUrl = null,
        public array $schemaOrg = [],
    ) {}

    /**
     * With the page's text the server does not need to fetch the page.
     */
    public function hasContent(): bool
    {
        return $this->contentMarkdown !== null;
    }
}
