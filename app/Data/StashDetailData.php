<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\FileRole;
use App\Models\Stash;
use App\Models\StashHighlight;
use App\Storage\StashStorage;
use Illuminate\Support\Str;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Everything the detail view needs on top of the card: the whole text, a larger preview image, where the
 * page came from and which collections the stash is in. Build it from a stash with `enrichment`,
 * `thumbnail`, `visibleTags`, `collections`, `highlights` and `files` loaded.
 */
#[TypeScript]
final readonly class StashDetailData
{
    private const EXCERPT_LENGTH = 2000;

    /**
     * @param  list<int>  $collection_ids
     * @param  list<HighlightData>  $highlights
     */
    public function __construct(
        public StashData $stash,
        public ?string $full_body,
        public ?string $excerpt,
        public ?ThumbnailData $preview,
        public ?string $site_name,
        public array $collection_ids,
        public array $highlights,
    ) {}

    public static function fromModel(Stash $stash, StashStorage $storage): self
    {
        $preview = $stash->files->first(static fn ($file): bool => $file->role === FileRole::Preview);
        $text = $stash->enrichment->extracted_text ?? null;
        $meta = $stash->meta ?? [];

        return new self(
            stash: StashData::fromModel($stash, $storage),
            full_body: $stash->body,
            excerpt: $text === null ? null : Str::limit($text, self::EXCERPT_LENGTH, preserveWords: true),
            preview: $preview === null
                ? null
                : new ThumbnailData($storage->url($preview), $preview->width, $preview->height),
            site_name: is_string($meta['site_name'] ?? null) ? $meta['site_name'] : null,
            collection_ids: array_values(
                $stash->collections->map(static fn ($collection): int => $collection->id)->all(),
            ),
            highlights: array_values(
                $stash->highlights->map(static fn (StashHighlight $highlight): HighlightData => HighlightData::fromModel(
                    $highlight,
                    $stash->url,
                ))->all(),
            ),
        );
    }
}
