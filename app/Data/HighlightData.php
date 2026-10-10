<?php

declare(strict_types=1);

namespace App\Data;

use App\Models\StashHighlight;
use App\Support\TextFragment;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * A highlight on the stash page: the passage, the note, and a link that opens the page at the passage.
 */
#[TypeScript]
final readonly class HighlightData
{
    public function __construct(
        public int $id,
        public string $text,
        public ?string $note,
        public ?string $color,
        public ?string $page_link,
        public string $created_at,
    ) {}

    public static function fromModel(StashHighlight $highlight, ?string $pageUrl): self
    {
        return new self(
            id: $highlight->id,
            text: $highlight->text,
            note: $highlight->note,
            color: $highlight->color,
            page_link: $pageUrl === null
                ? null
                : TextFragment::url($pageUrl, $highlight->text, $highlight->prefix, $highlight->suffix),
            created_at: (string)$highlight->created_at?->toIso8601String(),
        );
    }
}
