<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Ai\Embedding\Embedded;
use App\Ai\Embedding\Embedder;

/**
 * An embedder that answers with the vectors a test chose for exact texts, so a test can say which texts are
 * "near" without any language model. A text it does not know gets the last axis.
 */
final readonly class FixedEmbedder implements Embedder
{
    /**
     * @param  array<string, list<float>>  $vectors
     */
    public function __construct(
        private array $vectors,
        private int $dimensions = 16,
    ) {}

    /**
     * A vector along one axis: two such vectors on different axes are as unlike as vectors can be.
     *
     * @return list<float>
     */
    public static function axis(int $axis, int $dimensions = 16): array
    {
        $vector = array_fill(0, $dimensions, value: 0.0);
        $vector[$axis] = 1.0;

        return $vector;
    }

    public function name(): string
    {
        return 'text_v1';
    }

    public function provider(): string
    {
        return 'fake';
    }

    public function model(): string
    {
        return 'fake-embedding';
    }

    public function dimensions(): int
    {
        return $this->dimensions;
    }

    public function embed(array $texts): Embedded
    {
        return new Embedded(
            array_map(
                fn (string $text): array => (
                    $this->vectors[$text] ?? self::axis($this->dimensions - 1, $this->dimensions)
                ),
                $texts,
            ),
            tokens: count($texts),
        );
    }
}
