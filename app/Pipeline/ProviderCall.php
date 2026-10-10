<?php

declare(strict_types=1);

namespace App\Pipeline;

/**
 * What one call to a provider used, for the log and the monthly totals.
 */
final readonly class ProviderCall
{
    public function __construct(
        public string $provider,
        public string $model,
        public int $tokensIn,
        public int $tokensOut,
        public string $inputHash,
    ) {}
}
