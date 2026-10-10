<?php

declare(strict_types=1);

namespace App\Ai\Embedding;

/**
 * The vectors an embedder made, one per text in the order they were given, and the tokens it counted.
 */
final readonly class Embedded
{
    /**
     * @param  list<list<float>>  $vectors
     */
    public function __construct(
        public array $vectors,
        public int $tokens,
    ) {}
}
