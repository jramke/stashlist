<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\TagSource;
use App\Models\Tag;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * A tag as the UI shows it. $source is only set when the tag is shown on a stash (who put it there).
 */
#[TypeScript]
final readonly class TagData
{
    public function __construct(
        public int $id,
        public string $name,
        public int $stashes_count,
        public ?TagSource $source = null,
    ) {}

    public static function fromModel(Tag $tag): self
    {
        // Only tags loaded through a stash carry a pivot row, which says who put the tag there.
        /** @var Pivot|null $pivot */
        $pivot = $tag->relationLoaded('pivot') ? $tag->getRelation('pivot') : null;
        /** @var string|null $source */
        $source = $pivot?->getAttribute('source');

        return new self(
            id: $tag->id,
            name: $tag->name,
            stashes_count: $tag->stashes_count,
            source: $source === null ? null : TagSource::from($source),
        );
    }
}
