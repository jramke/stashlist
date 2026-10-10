<?php

declare(strict_types=1);

namespace App\Marketing;

/**
 * The changelog page's entries, read from CHANGELOG.md in the format of keepachangelog.com: a `## [version] - date`
 * line (or `## Unreleased`) and the bullets under it.
 */
final class Changelog
{
    /**
     * @return list<array{version: string, date: string|null, notes: list<string>}>
     */
    public static function entries(?string $path = null): array
    {
        $path ??= base_path('CHANGELOG.md');

        if (! is_file($path)) {
            return [];
        }

        $entries = [];

        foreach (preg_split('/\R/', (string)file_get_contents($path)) ?: [] as $line) {
            $heading = [];
            $bullet = [];

            if (preg_match('/^##\s+\[?([^\]\s]+)\]?(?:\s+-\s+(\S+))?\s*$/', $line, $heading) === 1) {
                $entries[] = ['version' => $heading[1], 'date' => $heading[2] ?? null, 'notes' => []];

                continue;
            }

            if ($entries !== [] && preg_match('/^\s*[-*]\s+(.+)$/', $line, $bullet) === 1) {
                $entries[array_key_last($entries)]['notes'][] = trim($bullet[1]);
            }
        }

        return $entries;
    }
}
