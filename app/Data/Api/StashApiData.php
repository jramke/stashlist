<?php

declare(strict_types=1);

namespace App\Data\Api;

use App\Enums\StashType;
use App\Models\Stash;
use App\Models\Tag;

/**
 * A stash as the API tells a client about it after saving or looking it up. The shape is a contract with
 * the extension and other clients: add keys, do not rename or drop them.
 */
final readonly class StashApiData
{
    /**
     * @param  list<string>  $tags
     */
    public function __construct(
        public int $id,
        public bool $created,
        public StashType $type,
        public ?string $url,
        public string $title,
        public array $tags,
        public string $web_url,
    ) {}

    /**
     * Build it from a stash with `enrichment` and `visibleTags` loaded.
     */
    public static function fromModel(Stash $stash, bool $created): self
    {
        return new self(
            id: $stash->id,
            created: $created,
            type: $stash->type,
            url: $stash->url,
            title: $stash->displayTitle(),
            tags: array_values($stash->visibleTags->map(static fn (Tag $tag): string => $tag->name)->all()),
            web_url: route('stashes.show', $stash),
        );
    }
}
