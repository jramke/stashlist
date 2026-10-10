<?php

declare(strict_types=1);

namespace App\Search;

use App\Ai\QueryEmbedder;
use App\Enums\SearchMode;
use App\Models\User;

/**
 * What turns a keyword search into a hybrid one: the vector of the query, which embedder it belongs to, how much
 * the meaning counts against the words, and the score under which results are dropped.
 */
final class HybridOptions
{
    public function __construct(
        private readonly QueryEmbedder $queryEmbedder,
    ) {}

    /**
     * The semantic half of a hybrid search: the vector of the query and how much it counts. Empty (a plain
     * keyword search) for the keyword mode, a query too short to mean anything, a user with smart features off
     * and when the query could not be embedded.
     *
     * @return array<string, mixed>
     */
    public function options(User $user, string $text, SearchMode $mode): array
    {
        if (
            $mode !== SearchMode::Hybrid ||
            mb_strlen($text) < config()->integer('stashlist.search.min_semantic_chars')
        ) {
            return [];
        }

        $vector = $this->queryEmbedder->embed($user, $text);

        return (
            $vector === null
                ? []
                : [
                    'vector' => $vector,
                    'hybrid' => [
                        'embedder' => config()->string('stashlist.search.embedder'),
                        'semanticRatio' => $this->ratio($text),
                    ],
                    'rankingScoreThreshold' => config()->float('stashlist.search.threshold'),
                ]
        );
    }

    /**
     * Single words are keywords, and their semantic neighbours are noise; a sentence is meaning.
     */
    private function ratio(string $text): float
    {
        $words = count(preg_split('/\s+/u', $text, flags: PREG_SPLIT_NO_EMPTY) ?: []);

        return config()->float('stashlist.search.ratio.'.match (true) {
            $words <= 1 => 'short',
            $words === 2 => 'default',
            default => 'long',
        });
    }
}
