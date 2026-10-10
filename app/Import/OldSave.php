<?php

declare(strict_types=1);

namespace App\Import;

/**
 * A row of the old app's `save` table, as it is in the dump. Empty values are empty strings there, never NULL.
 */
final readonly class OldSave
{
    public function __construct(
        public string $id,
        public string $userId,
        public string $type,
        public string $url,
        public string $title,
        public string $description,
        public string $faviconUrl,
        public string $imageUrl,
        public string $text,
        public string $createdAt,
    ) {}
}
