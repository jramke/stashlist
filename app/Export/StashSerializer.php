<?php

declare(strict_types=1);

namespace App\Export;

use App\Enums\FileRole;
use App\Models\Collection;
use App\Models\Stash;
use App\Models\StashFile;
use App\Models\StashHighlight;
use App\Models\Tag;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * One stash as it appears in an export: what the person made, what the machine added and the files that go with
 * it. Build it from a stash with `enrichment`, `tags`, `collections`, `highlights` and `files` loaded.
 */
final class StashSerializer
{
    /** Roles worth keeping: the thumbnails and previews are made from these. */
    private const FILE_ROLES = [FileRole::Original, FileRole::Screenshot, FileRole::Og];

    /**
     * The stored files that belong in the zip, each with its name in it.
     *
     * @return list<array{file: StashFile, name: string}>
     */
    public static function files(Stash $stash): array
    {
        $files = [];

        foreach ($stash->files as $file) {
            if (! in_array($file->role, self::FILE_ROLES, strict: true)) {
                continue;
            }

            $extension = pathinfo($file->path, PATHINFO_EXTENSION);
            $files[] = ['file' => $file, 'name' => "files/{$stash->id}/{$file->role->value}.{$extension}"];
        }

        return $files;
    }

    /**
     * @return array<string, mixed>
     */
    public static function toArray(Stash $stash): array
    {
        $enrichment = $stash->enrichment;

        return [
            'id' => $stash->id,
            'type' => $stash->type->value,
            'subtype' => $stash->subtype,
            'title' => $stash->title,
            'body' => $stash->body,
            'url' => $stash->url,
            'domain' => $stash->domain,
            'meta' => $stash->meta,
            'created_at' => $stash->created_at?->toIso8601String(),
            'updated_at' => $stash->updated_at?->toIso8601String(),
            'page_title' => $enrichment->title ?? null,
            'description' => $enrichment->description ?? null,
            'summary' => $enrichment->summary ?? null,
            'language' => $enrichment->language ?? null,
            'text' => $enrichment->extracted_text ?? null,
            'text_in_picture' => $enrichment->ocr_text ?? null,
            'objects' => $enrichment->objects ?? [],
            'colors' => $enrichment->color_names ?? [],
            'tags' => array_values($stash->tags->map(self::tag(...))->all()),
            'collections' => array_values(
                $stash->collections->map(static fn (Collection $collection): int => $collection->id)->all(),
            ),
            'highlights' => array_values(
                $stash->highlights->map(static fn (StashHighlight $highlight): array => [
                    'text' => $highlight->text,
                    'before' => $highlight->prefix,
                    'after' => $highlight->suffix,
                    'color' => $highlight->color,
                    'note' => $highlight->note,
                    'created_at' => $highlight->created_at?->toIso8601String(),
                ])->all(),
            ),
            'files' => array_map(static fn (array $entry): array => [
                'role' => $entry['file']->role->value,
                'path' => $entry['name'],
                'mime' => $entry['file']->mime,
                'bytes' => $entry['file']->bytes,
            ], self::files($stash)),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function tag(Tag $tag): array
    {
        /** @var Pivot $link */
        $link = $tag->getRelation('pivot');

        return [
            'id' => $tag->id,
            'name' => $tag->name,
            'added_by' => $link->getAttribute('source'),
            'dismissed' => $link->getAttribute('dismissed_at') !== null,
        ];
    }
}
