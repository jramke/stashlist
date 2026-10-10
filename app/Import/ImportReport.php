<?php

declare(strict_types=1);

namespace App\Import;

use App\Enums\StashType;

/**
 * What an import did, or with a dry run would do: per stash type how many saves are new and how many were
 * there already, and how many were skipped for which reason.
 */
final class ImportReport
{
    /** @var array<string, int> */
    private array $created = [];

    /** @var array<string, int> */
    private array $existing = [];

    /** @var array<string, int> */
    private array $skipped = [];

    public function created(StashType $type): void
    {
        $this->created[$type->value] = ($this->created[$type->value] ?? 0) + 1;
    }

    public function existing(StashType $type): void
    {
        $this->existing[$type->value] = ($this->existing[$type->value] ?? 0) + 1;
    }

    public function skipped(string $reason): void
    {
        $this->skipped[$reason] = ($this->skipped[$reason] ?? 0) + 1;
    }

    public function createdCount(?StashType $type = null): int
    {
        return $type === null ? array_sum($this->created) : $this->created[$type->value] ?? 0;
    }

    public function existingCount(?StashType $type = null): int
    {
        return $type === null ? array_sum($this->existing) : $this->existing[$type->value] ?? 0;
    }

    /**
     * @return array<string, int> reason => number of saves
     */
    public function skippedByReason(): array
    {
        return $this->skipped;
    }

    public function skippedCount(): int
    {
        return array_sum($this->skipped);
    }
}
