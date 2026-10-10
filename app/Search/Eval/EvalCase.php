<?php

declare(strict_types=1);

namespace App\Search\Eval;

/**
 * One query of the eval set with the stashes a person would expect to find for it.
 */
final readonly class EvalCase
{
    /**
     * @param  list<int>  $expected  stash ids
     */
    public function __construct(
        public string $query,
        public array $expected,
    ) {}
}
