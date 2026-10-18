<?php

declare(strict_types=1);

namespace App\Search;

use Meilisearch\Endpoints\Indexes;

/**
 * The score cut that follows a search: nothing scoring under a part of the score of its best result.
 *
 * It asks the engine for that best result first (one hit, same query, same filter, a few milliseconds), then sets
 * the engine's own `rankingScoreThreshold`, so pages and totals stay right. A search that has no hits keeps its
 * options, and a higher floor already in them wins.
 */
final class ScoreCut
{
    /**
     * @param  array<array-key, mixed>  $options
     * @return array<array-key, mixed>
     */
    public static function apply(Indexes $engine, string $text, array $options, float $relative): array
    {
        if ($relative <= 0.0) {
            return $options;
        }

        $probe = $options;
        unset($probe['limit'], $probe['offset'], $probe['page'], $probe['hitsPerPage']);
        $probe['limit'] = 1;
        $probe['showRankingScore'] = true;

        // @mago-expect analysis:mixed-assignment
        $best = $engine->rawSearch($text, $probe)['hits'][0]['_rankingScore'] ?? null;

        if (! is_float($best) && ! is_int($best)) {
            return $options;
        }

        $floor = is_numeric($options['rankingScoreThreshold'] ?? null) ? (float)$options['rankingScoreThreshold'] : 0.0;
        $options['rankingScoreThreshold'] = max($floor, (float)$best * $relative);

        return $options;
    }
}
