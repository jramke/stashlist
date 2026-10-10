<?php

declare(strict_types=1);

namespace App\Search\Eval;

/**
 * How a search did on the eval set: for each query the ids it returned, and the averages that compare two
 * settings. Recall at k is the share of the expected stashes within the first k; the reciprocal rank is one
 * over the place of the first expected stash (zero when none was found), averaged over the queries.
 */
final readonly class EvalScore
{
    /**
     * @param  list<EvalCase>  $cases
     * @param  list<list<int>>  $found  the ids returned for each case, best first
     */
    public function __construct(
        public array $cases,
        public array $found,
    ) {}

    public function recallAt(int $k): float
    {
        return $this->average(static function (EvalCase $case, array $found) use ($k): float {
            $hits = array_intersect($case->expected, array_slice($found, offset: 0, length: $k));

            return count($hits) / max(1, count($case->expected));
        });
    }

    public function meanReciprocalRank(): float
    {
        return $this->average(static function (EvalCase $case, array $found): float {
            foreach ($found as $position => $id) {
                if (in_array($id, $case->expected, strict: true)) {
                    return 1 / ($position + 1);
                }
            }

            return 0.0;
        });
    }

    /**
     * @return list<array{case: EvalCase, found: list<int>}> the queries where none of the expected stashes made the first ten
     */
    public function misses(): array
    {
        $misses = [];

        foreach ($this->cases as $position => $case) {
            $found = $this->found[$position] ?? [];

            if (array_intersect($case->expected, array_slice($found, offset: 0, length: 10)) === []) {
                $misses[] = ['case' => $case, 'found' => array_slice($found, offset: 0, length: 10)];
            }
        }

        return $misses;
    }

    /**
     * @param  callable(EvalCase, list<int>): float  $measure
     */
    private function average(callable $measure): float
    {
        if ($this->cases === []) {
            return 0.0;
        }

        $sum = 0.0;

        foreach ($this->cases as $position => $case) {
            $sum += $measure($case, $this->found[$position] ?? []);
        }

        return $sum / count($this->cases);
    }
}
