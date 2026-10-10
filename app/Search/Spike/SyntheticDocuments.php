<?php

declare(strict_types=1);

namespace App\Search\Spike;

/**
 * Made-up documents for measuring the search engine at a size we do not have yet: words from a fixed
 * vocabulary, so they overlap the way real text does, and random unit vectors.
 */
final readonly class SyntheticDocuments
{
    private const VOCABULARY = 3000;

    public function __construct(
        private int $users,
        private int $dimensions,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function document(int $id): array
    {
        return [
            'id' => $id,
            'user_id' => $id % $this->users,
            'title' => $this->words(4),
            'body' => $this->words(250),
            '_vectors' => ['text_v1' => $this->vector()],
        ];
    }

    /**
     * @return list<float>
     */
    public function vector(): array
    {
        $vector = [];
        $length = 0.0;

        for ($i = 0; $i < $this->dimensions; $i++) {
            $value = (mt_rand() / mt_getrandmax()) - 0.5;
            $vector[] = $value;
            $length += $value * $value;
        }

        $length = sqrt($length);

        return array_map(static fn (float $value): float => $value / $length, $vector);
    }

    public function words(int $count): string
    {
        $words = [];

        for ($i = 0; $i < $count; $i++) {
            $words[] = 'w'.mt_rand(1, self::VOCABULARY);
        }

        return implode(' ', $words);
    }

    public function user(): int
    {
        return mt_rand(0, $this->users - 1);
    }
}
