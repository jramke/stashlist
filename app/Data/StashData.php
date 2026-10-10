<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\AiStatus;
use App\Enums\StashType;
use App\Models\Stash;
use App\Storage\StashStorage;
use Illuminate\Support\Str;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * A stash as a card in the feed. $title is null for a note or color the user did not title. Build it from a stash with `enrichment`, `thumbnail` and `visibleTags`
 * loaded (see FeedQuery::EAGER), so no query runs per card.
 */
#[TypeScript]
final readonly class StashData
{
    private const BODY_PREVIEW_LENGTH = 1000;

    /**
     * @param  list<ColorData>  $colors
     * @param  list<TagData>  $tags
     */
    public function __construct(
        public int $id,
        public StashType $type,
        public ?string $subtype,
        public ?string $title,
        public ?string $description,
        public ?string $url,
        public ?string $domain,
        public ?string $body,
        public bool $is_private,
        public AiStatus $ai_status,
        public ?string $ai_error,
        public ?ThumbnailData $thumbnail,
        public array $colors,
        public array $tags,
        public string $created_at,
        public bool $fetching,
    ) {}

    public static function fromModel(Stash $stash, StashStorage $storage): self
    {
        $thumb = $stash->thumbnail;

        return new self(
            id: $stash->id,
            type: $stash->type,
            subtype: $stash->subtype,
            // Notes and colors show their content; they only have a title when the user gave one.
            title: $stash->type === StashType::Note || $stash->type === StashType::Color
                ? $stash->title
                : $stash->displayTitle(),
            description: $stash->enrichment->description ?? null,
            url: $stash->url,
            domain: $stash->domain,
            body: $stash->body === null
                ? null
                : Str::limit($stash->body, self::BODY_PREVIEW_LENGTH, preserveWords: true),
            is_private: $stash->is_private,
            ai_status: $stash->ai_status,
            ai_error: $stash->ai_error,
            thumbnail: $thumb === null ? null : new ThumbnailData($storage->url($thumb), $thumb->width, $thumb->height),
            colors: array_map(
                static fn (array $color): ColorData => new ColorData($color['hex'], $color['pct']),
                $stash->enrichment->colors ?? [],
            ),
            tags: array_values($stash->visibleTags->map(TagData::fromModel(...))->all()),
            created_at: $stash->created_at?->toIso8601String() ?? '',
            fetching: self::isFetching($stash),
        );
    }

    /**
     * Whether extraction is still expected to fill this card in: links and images that have not been read yet
     * and have not failed. After ten minutes the card stops waiting, so a stopped queue does not leave a
     * spinner running for good.
     */
    private static function isFetching(Stash $stash): bool
    {
        $extractable = $stash->type === StashType::Link || $stash->type === StashType::Image;

        return (
            $extractable &&
            $stash->ai_status !== AiStatus::Failed &&
            ($stash->enrichment->extracted_at ?? null) === null &&
            $stash->created_at !== null &&
            $stash->created_at->isAfter(now()->subMinutes(10))
        );
    }
}
