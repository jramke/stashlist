<?php

declare(strict_types=1);

namespace App\Ai;

use App\Enums\FileRole;
use App\Models\Stash;
use App\Models\StashFile;

/**
 * Which picture a stash holds, as a string that changes when the picture does: the hash of the original, or for
 * want of one the name of the preview file, which carries the first eight characters of its hash.
 */
final class PictureFingerprint
{
    public static function of(Stash $stash): string
    {
        $original = $stash->files()->where('role', FileRole::Original->value)->first();

        if ($original instanceof StashFile && $original->sha256 !== null) {
            return $original->sha256;
        }

        $preview = $stash->files()->where('role', FileRole::Preview->value)->first();

        return $preview instanceof StashFile ? $preview->path : '';
    }
}
