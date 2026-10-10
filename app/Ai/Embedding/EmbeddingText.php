<?php

declare(strict_types=1);

namespace App\Ai\Embedding;

use App\Models\Stash;
use App\Models\StashHighlight;
use App\Models\Tag;
use Illuminate\Support\Str;

/**
 * What a stash is embedded as: its title, summary, tags, the passages the user marked, where it lives and then
 * the user's own words or the start of the page text. About 500 tokens at most. Changing this template bumps
 * VERSION, which marks every stored vector as stale.
 *
 * Build it from a stash with `enrichment`, `visibleTags` and `highlights` loaded.
 */
final class EmbeddingText
{
    public const VERSION = 1;

    private const MAX = 2000;

    private const HIGHLIGHTS = 600;

    private const CONTENT = 1200;

    public static function of(Stash $stash): string
    {
        $enrichment = $stash->enrichment;
        $tags = array_values($stash->visibleTags->map(static fn (Tag $tag): string => $tag->name)->all());
        $highlights = array_values(
            $stash->highlights->map(static fn (StashHighlight $highlight): string => $highlight->text)->all(),
        );

        $parts = [
            $stash->displayTitle(),
            $enrichment->summary ?? null,
            $tags === [] ? null : 'Tags: '.implode(', ', $tags),
            $highlights === [] ? null : Str::limit(implode(' ', $highlights), self::HIGHLIGHTS, ''),
            $stash->domain,
            self::content($stash),
        ];

        $lines = [];

        foreach ($parts as $part) {
            $line = trim((string)$part);

            if ($line !== '') {
                $lines[] = $line;
            }
        }

        return Str::limit(implode("\n", $lines), self::MAX, '');
    }

    /**
     * The user's own words win; else the start of the page text; else what was read from an image.
     */
    private static function content(Stash $stash): ?string
    {
        $text = $stash->body ?? $stash->enrichment->extracted_text ?? $stash->enrichment->ocr_text ?? null;

        return $text === null ? null : Str::limit($text, self::CONTENT, '');
    }
}
