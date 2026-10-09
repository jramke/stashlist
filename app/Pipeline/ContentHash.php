<?php

declare(strict_types=1);

namespace App\Pipeline;

use App\Enums\StashType;

/**
 * Fingerprint of what the user controls about a stash: its type, URL, text and uploaded file. A change
 * restarts the pipeline; edits to anything else (title, tags, collections) do not.
 */
final class ContentHash
{
    public static function of(StashType $type, ?string $url, ?string $body, ?string $fileSha256): string
    {
        return hash(algo: 'sha256', data: implode("\n", [$type->value, $url ?? '', $body ?? '', $fileSha256 ?? '']));
    }
}
