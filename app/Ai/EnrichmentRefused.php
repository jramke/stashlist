<?php

declare(strict_types=1);

namespace App\Ai;

use RuntimeException;

/**
 * The model gave no answer at all: it declined, or its safety filter stopped it. Asking again will not help.
 */
final class EnrichmentRefused extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('The model declined to answer.');
    }
}
