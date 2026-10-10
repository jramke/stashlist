<?php

declare(strict_types=1);

namespace App\Search\Eval;

use App\Data\FeedFiltersData;
use App\Enums\SearchMode;
use App\Models\Stash;
use App\Models\User;
use App\Search\StashSearch;
use JsonException;
use RuntimeException;

/**
 * Runs the eval set (real queries of a person with the stashes they should find, in the languages they use)
 * through the search, so settings can be compared with numbers: the keyword search against the hybrid one, one
 * embedder against another, a ratio or a threshold against another. Not a test that passes or fails: a way to
 * choose.
 */
final class SearchEval
{
    private const DEPTH = 10;

    public function __construct(
        private readonly StashSearch $search,
    ) {}

    /**
     * The eval file is a JSON list of {"q": "...", "expect": [stash ids]}.
     *
     * @return list<EvalCase>
     */
    public function load(string $path): array
    {
        if (! is_file($path)) {
            throw new RuntimeException("There is no eval set at {$path}.");
        }

        try {
            // @mago-expect analysis:mixed-assignment
            $decoded = json_decode((string)file_get_contents($path), associative: true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException $failure) {
            throw new RuntimeException("The eval set is not valid JSON: {$failure->getMessage()}", previous: $failure);
        }

        $cases = [];

        // @mago-expect analysis:mixed-assignment
        foreach (is_array($decoded) ? $decoded : [] as $entry) {
            $case = self::caseOf($entry);

            if ($case !== null) {
                $cases[] = $case;
            }
        }

        return $cases;
    }

    private static function caseOf(mixed $entry): ?EvalCase
    {
        if (! is_array($entry) || ! is_string($entry['q'] ?? null) || ! is_array($entry['expect'] ?? null)) {
            return null;
        }

        return new EvalCase($entry['q'], array_values(array_map(intval(...), $entry['expect'])));
    }

    /**
     * @param  list<EvalCase>  $cases
     */
    public function run(User $user, array $cases, SearchMode $mode): EvalScore
    {
        $found = [];

        foreach ($cases as $case) {
            $found[] = array_values(array_map(
                static fn (Stash $stash): int => $stash->id,
                $this->search->search($user, $case->query, new FeedFiltersData, self::DEPTH, $mode)->items(),
            ));
        }

        return new EvalScore($cases, $found);
    }
}
