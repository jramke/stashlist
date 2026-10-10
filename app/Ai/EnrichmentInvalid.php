<?php

declare(strict_types=1);

namespace App\Ai;

use RuntimeException;

/**
 * The model answered, but not in a shape the rules accept (too few tags, a summary that is too long, ...).
 */
final class EnrichmentInvalid extends RuntimeException
{
    /**
     * @param  list<string>  $errors  what to fix, in words the model can act on
     */
    public function __construct(
        public readonly array $errors,
    ) {
        parent::__construct('The answer broke the rules: '.implode(' ', $errors));
    }
}
