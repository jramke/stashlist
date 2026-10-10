<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\ExportStatus;
use App\Models\Export;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * An export as the settings page lists it.
 */
#[TypeScript]
final readonly class ExportData
{
    public function __construct(
        public int $id,
        public ExportStatus $status,
        public ?int $bytes,
        public ?int $stash_count,
        public string $created_at,
        public ?string $expires_at,
        public bool $downloadable,
    ) {}

    public static function fromModel(Export $export): self
    {
        return new self(
            id: $export->id,
            status: $export->status,
            bytes: $export->bytes,
            stash_count: $export->stash_count,
            created_at: $export->created_at?->toIso8601String() ?? '',
            expires_at: $export->expires_at?->toIso8601String(),
            downloadable: $export->isDownloadable(),
        );
    }
}
