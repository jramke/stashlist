<?php

declare(strict_types=1);

namespace App\Extraction;

use App\Enums\FileRole;
use App\Models\Stash;

/**
 * Whether the client that saved a link chose its picture, so the page's own Open Graph picture must not replace
 * it. The browser extension names the picture the person right-clicked, which is not always the Open Graph image:
 * either as bytes it sent (`meta.client_picture`), or as an address (`meta.image_url`) that DeriveCapturedImage has
 * made into the stash's picture. An address that could not be fetched chose nothing: the page's picture is the
 * fallback.
 */
final readonly class ClientPicture
{
    public static function isKept(Stash $stash): bool
    {
        $meta = $stash->meta ?? [];

        if (($meta['client_picture'] ?? false) === true) {
            return true;
        }

        return is_string($meta['image_url'] ?? null) && $stash->files()->where('role', FileRole::Og->value)->exists();
    }
}
