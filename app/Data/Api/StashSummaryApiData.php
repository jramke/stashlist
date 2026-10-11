<?php

declare(strict_types=1);

namespace App\Data\Api;

use App\Enums\StashType;
use App\Models\Stash;
use App\Models\Tag;
use App\Storage\StashStorage;

/**
 * A stash in the list of the API: what a client shows in a search result. A contract like StashApiData: add
 * keys, do not rename or drop them.
 */
final readonly class StashSummaryApiData
{
    /**
     * @param  list<string>  $tags
     */
    public function __construct(
        public int $id,
        public StashType $type,
        public ?string $url,
        public string $title,
        public ?string $summary,
        public array $tags,
        public string $web_url,
        public ?string $thumbnail_url,
        public string $created_at,
    ) {}

    /**
     * Build it from a stash with `enrichment`, `thumbnail` and `visibleTags` loaded.
     */
    public static function fromModel(Stash $stash, StashStorage $storage): self
    {
        $thumbnail = $stash->thumbnail;

        return new self(
            id: $stash->id,
            type: $stash->type,
            url: $stash->url,
            title: $stash->displayTitle(),
            summary: $stash->enrichment->summary ?? null,
            tags: array_values($stash->visibleTags->map(static fn (Tag $tag): string => $tag->name)->all()),
            web_url: route('stashes.show', $stash),
            thumbnail_url: $thumbnail === null ? null : $storage->url($thumbnail),
            created_at: (string)$stash->created_at?->toIso8601String(),
        );
    }
}
