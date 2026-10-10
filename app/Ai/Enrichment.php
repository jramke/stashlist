<?php

declare(strict_types=1);

namespace App\Ai;

use App\Pipeline\ProviderCall;

/**
 * An accepted answer with what it took to get it.
 */
final readonly class Enrichment
{
    public function __construct(
        public EnrichmentResult $result,
        public ProviderCall $call,
    ) {}
}
