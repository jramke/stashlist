<?php

declare(strict_types=1);

namespace App\Actions\Stashes;

use App\Enums\StashType;

/**
 * What a capture request turned out to be, before anything is saved.
 */
final readonly class StashDraft
{
    public function __construct(
        public StashType $type,
        public ?string $url = null,
        public ?string $urlHash = null,
        public ?string $domain = null,
        public ?string $body = null,
        public ?string $fileBytes = null,
        public ?string $fileMime = null,
    ) {}
}
