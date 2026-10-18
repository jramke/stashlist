<?php

declare(strict_types=1);

namespace App\Extraction;

use App\Enums\ColorName;
use App\Images\ColorBuckets;
use App\Models\Stash;
use App\Models\StashEnrichment;
use Illuminate\Support\Facades\DB;

/**
 * Writes what extraction found: the stage 1 columns of the enrichment and the machine-owned parts of the
 * stash (type when a link turned out to be an image, subtype, meta).
 */
final class ExtractionRecorder
{
    public function record(Stash $stash, ExtractionResult $result): void
    {
        DB::transaction(static function () use ($stash, $result): void {
            StashEnrichment::query()->updateOrCreate(
                ['stash_id' => $stash->id],
                [
                    'user_id' => $stash->user_id,
                    'title' => $result->title,
                    'description' => $result->description,
                    'extracted_text' => $result->text,
                    ...self::colors($result),
                    'extract_hash' => $result->hash,
                    'extracted_at' => now(),
                ],
            );

            $stash->forceFill([
                'type' => $result->type ?? $stash->type,
                'subtype' => $result->subtype ?? $stash->subtype,
                'meta' => [...($stash->meta ?? []), ...$result->meta],
            ])->save();
        });
    }

    /**
     * The colors of the picture this run looked at. A run that looked at none (the client's own picture was kept,
     * or the page has no picture) leaves the colors made from the picture the stash has.
     *
     * @return array{colors: list<array{hex: string, pct: float}>, color_names: list<string>}|array{}
     */
    private static function colors(ExtractionResult $result): array
    {
        if ($result->colors === null) {
            return [];
        }

        return [
            'colors' => $result->colors,
            'color_names' => array_map(
                static fn (ColorName $name): string => $name->value,
                ColorBuckets::names($result->colors),
            ),
        ];
    }
}
