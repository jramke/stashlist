<?php

declare(strict_types=1);

namespace App\Ai\Bakeoff;

use App\Ai\EnrichmentResult;
use App\Pipeline\ProviderCall;

/**
 * One model's try at one stash: its answer and what it cost, or the code of what went wrong.
 */
final readonly class Trial
{
    public function __construct(
        public int $stashId,
        public string $model,
        public ?EnrichmentResult $result,
        public ?ProviderCall $call,
        public ?string $error,
        public int $milliseconds,
        public int $costMicros,
    ) {}

    public function succeeded(): bool
    {
        return $this->result !== null;
    }
}
