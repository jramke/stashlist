<?php

declare(strict_types=1);

namespace App\Ai\Bakeoff;

/**
 * How one model did over all stashes: the numbers of its row in the report.
 */
final readonly class ModelSummary
{
    public function __construct(
        public string $model,
        public int $worked,
        public int $failed,
        public float $averageTags,
        public float $medianSeconds,
        public int $tokensIn,
        public int $tokensOut,
        public int $costMicros,
    ) {}

    /**
     * @param  list<Trial>  $trials  the trials of this model
     */
    public static function of(string $model, array $trials): self
    {
        $worked = array_values(array_filter($trials, static fn (Trial $trial): bool => $trial->succeeded()));
        $tags = array_map(static fn (Trial $trial): int => count($trial->result->tags ?? []), $worked);
        $seconds = array_map(static fn (Trial $trial): float => $trial->milliseconds / 1000, $trials);
        sort($seconds);

        return new self(
            model: $model,
            worked: count($worked),
            failed: count($trials) - count($worked),
            averageTags: $tags === [] ? 0.0 : array_sum($tags) / count($tags),
            medianSeconds: $seconds === [] ? 0.0 : $seconds[intdiv(count($seconds), num2: 2)],
            tokensIn: array_sum(array_map(static fn (Trial $trial): int => $trial->call->tokensIn ?? 0, $trials)),
            tokensOut: array_sum(array_map(static fn (Trial $trial): int => $trial->call->tokensOut ?? 0, $trials)),
            costMicros: array_sum(array_map(static fn (Trial $trial): int => $trial->costMicros, $trials)),
        );
    }

    public function costPerStash(): float
    {
        $count = $this->worked + $this->failed;

        return $count === 0 ? 0.0 : ($this->costMicros / 1_000_000) / $count;
    }
}
