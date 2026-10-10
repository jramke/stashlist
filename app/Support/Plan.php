<?php

declare(strict_types=1);

namespace App\Support;

/**
 * What an account may use (one entry of config('stashlist.plans')). A null cap is no cap.
 */
final readonly class Plan
{
    public function __construct(
        public string $name,
        public ?int $stashes,
        public ?int $storageBytes,
        public ?int $aiStashesPerMonth,
        public int $searchesPerMinute,
    ) {}
}
