<?php

declare(strict_types=1);

namespace App\Import;

use App\Enums\StashType;
use Carbon\CarbonImmutable;

/**
 * What an old save becomes: the columns of the new stash, and the scraped description that goes to its
 * enrichment.
 */
final readonly class MappedSave
{
    public function __construct(
        public StashType $type,
        public string $importId,
        public CarbonImmutable $createdAt,
        public ?string $title = null,
        public ?string $body = null,
        public ?string $url = null,
        public ?string $urlHash = null,
        public ?string $domain = null,
        public ?string $description = null,
        public ?string $faviconUrl = null,
    ) {}
}
