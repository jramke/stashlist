<?php

declare(strict_types=1);

namespace App\Ai\Embedding;

/**
 * Vectors for tests and for trying the pipeline without a provider. Deterministic: every word of a text adds a
 * signed unit to one place of the vector (chosen by a hash of the word) and the result is normalized, so texts
 * that share words are close and texts that share none are not. That is enough to see hybrid search work.
 */
final readonly class FakeEmbedder implements Embedder
{
    public function __construct(
        private string $name = 'text_v1',
        private int $dimensions = 16,
    ) {}

    public function name(): string
    {
        return $this->name;
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
            array_map($this->vector(...), $texts),
            tokens: array_sum(array_map(
                static fn (string $text): int => max(1, intdiv(mb_strlen($text), num2: 4)),
                $texts,
            )),
        );
    }

    /**
     * @return list<float>
     */
    private function vector(string $text): array
    {
        $vector = array_fill(0, max(1, $this->dimensions), value: 0.0);

        foreach (preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower($text), flags: PREG_SPLIT_NO_EMPTY) ?: [] as $word) {
            $hash = crc32($word);
            $vector[$hash % $this->dimensions] += ($hash & 1) === 1 ? 1.0 : -1.0;
        }

        $length = sqrt(array_sum(array_map(static fn (float $value): float => $value * $value, $vector)));

        return $length === 0.0
            ? $vector
            : array_map(static fn (float $value): float => $value / $length, $vector);
    }
}
