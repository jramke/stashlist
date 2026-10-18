<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\AiStatus;
use App\Enums\StashType;
use App\Models\Stash;
use App\Models\StashFile;
use App\Stashes\Progress;
use App\Storage\StashStorage;
use Illuminate\Support\Str;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * A stash as a card in the feed. $title is null for a note or color the user did not title. Build it from a stash with `enrichment`, `thumbnail`, `thumbnailSmall`, `favicon` and `visibleTags`
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
        public ?string $summary,
        public ?string $url,
        public ?string $domain,
        public ?string $body,
        public AiStatus $ai_status,
        public ?string $ai_error,
        public ?ThumbnailData $thumbnail,
        public array $colors,
        public array $tags,
        public string $created_at,
        public bool $fetching,
        public bool $tagging,
        public ?PriceData $price,
        /** The icon of the site, made small and kept with the stash (never the site's own address). */
        public ?string $favicon,
    ) {}

    public static function fromModel(Stash $stash, StashStorage $storage): self
    {
        $thumb = $stash->thumbnail;
        $small = $stash->thumbnailSmall;

        return new self(
            id: $stash->id,
            type: $stash->type,
            subtype: $stash->subtype,
            // Notes and colors show their content; they only have a title when the user gave one.
            title: $stash->type === StashType::Note || $stash->type === StashType::Color
                ? $stash->title
                : $stash->displayTitle(),
            description: $stash->enrichment->description ?? null,
            summary: $stash->enrichment->summary ?? null,
            url: $stash->url,
            domain: $stash->domain,
            body: $stash->body === null
                ? null
                : Str::limit($stash->body, self::BODY_PREVIEW_LENGTH, preserveWords: true),
            ai_status: $stash->ai_status,
            ai_error: $stash->ai_error,
            thumbnail: $thumb === null
                ? null
                : new ThumbnailData(
                    $storage->url($thumb),
                    $thumb->width,
                    $thumb->height,
                    srcset: self::srcset($thumb, $small, $storage),
                ),
            colors: array_map(
                static fn (array $color): ColorData => new ColorData($color['hex'], $color['pct']),
                $stash->enrichment->colors ?? [],
            ),
            tags: array_values($stash->visibleTags->map(TagData::fromModel(...))->all()),
            created_at: $stash->created_at?->toIso8601String() ?? '',
            fetching: Progress::isFetching($stash),
            tagging: Progress::isTagging($stash),
            price: PriceData::fromMeta($stash->meta['price'] ?? null),
            favicon: $stash->favicon === null ? null : $storage->url($stash->favicon),
        );
    }

    /**
     * Both thumbnails as the value of an `srcset` attribute, the small one first; null when there is only one.
     */
    private static function srcset(StashFile $thumb, ?StashFile $small, StashStorage $storage): ?string
    {
        if ($small === null || $small->width === null || $thumb->width === null) {
            return null;
        }

        return $storage->url($small)." {$small->width}w, ".$storage->url($thumb)." {$thumb->width}w";
    }
}
