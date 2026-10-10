<?php

declare(strict_types=1);

namespace App\Ai\Bakeoff;

use App\Models\Stash;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * The bake-off as a Markdown page: a table per model (how often it worked, how many tags, how fast, what it
 * cost) and then every stash with each model's answer side by side, which is where the quality is judged.
 */
final class Report
{
    /**
     * @param  Collection<int, Stash>  $stashes
     * @param  list<string>  $models  names as given to the command
     * @param  list<Trial>  $trials
     */
    public function markdown(Collection $stashes, array $models, array $trials): string
    {
        $lines = [
            '# Bake-off',
            '',
            sprintf('%d stashes, %d models, %s.', $stashes->count(), count($models), now()->toDateTimeString()),
            '',
            '## Per model',
            '',
            '| Model | Worked | Failed | Tags (avg) | Seconds (median) | Tokens in / out | Cost | Per stash |',
            '| --- | --- | --- | --- | --- | --- | --- | --- |',
            ...array_map(
                fn (string $model): string => $this->row(ModelSummary::of($model, $this->trialsOf($trials, $model))),
                $models,
            ),
            '',
        ];

        $lines = [...$lines, ...$this->failures($trials), '## Stash by stash', ''];

        foreach ($stashes->values() as $position => $stash) {
            $lines = [...$lines, ...$this->stash($position + 1, $stash, $models, $trials)];
        }

        return implode("\n", $lines)."\n";
    }

    /**
     * @param  list<Trial>  $trials
     * @return list<Trial>
     */
    private function trialsOf(array $trials, string $model): array
    {
        return array_values(array_filter($trials, static fn (Trial $trial): bool => $trial->model === $model));
    }

    private function row(ModelSummary $summary): string
    {
        return sprintf(
            '| %s | %d | %d | %s | %s | %s / %s | $%s | $%s |',
            $summary->model,
            $summary->worked,
            $summary->failed,
            $summary->worked === 0 ? '-' : number_format($summary->averageTags, decimals: 1),
            number_format($summary->medianSeconds, decimals: 1),
            number_format($summary->tokensIn),
            number_format($summary->tokensOut),
            number_format($summary->costMicros / 1_000_000, decimals: 4),
            number_format($summary->costPerStash(), decimals: 5),
        );
    }

    /**
     * @param  list<Trial>  $trials
     * @return list<string>
     */
    private function failures(array $trials): array
    {
        $failed = array_filter($trials, static fn (Trial $trial): bool => ! $trial->succeeded());

        if ($failed === []) {
            return [];
        }

        return [
            '## Failures',
            '',
            ...array_map(
                static fn (Trial $trial): string => "- stash {$trial->stashId}, {$trial->model}: {$trial->error}",
                array_values($failed),
            ),
            '',
        ];
    }

    /**
     * @param  list<string>  $models
     * @param  list<Trial>  $trials
     * @return list<string>
     */
    private function stash(int $number, Stash $stash, array $models, array $trials): array
    {
        $title = $stash->title ?? $stash->enrichment->title ?? $stash->domain ?? 'Note';
        $lines = ["### {$number}. {$title}", ''];

        $material = Str::limit((string)($stash->enrichment->extracted_text ?? $stash->body), 300, '...');
        $lines = [...$lines, '> '.str_replace(search: "\n", replace: ' ', subject: $material), ''];

        foreach ($models as $model) {
            $trial = collect($trials)->first(
                static fn (Trial $candidate): bool => (
                    $candidate->stashId === $stash->id &&
                    $candidate->model === $model
                ),
            );

            $lines[] = $trial === null || ! $trial->succeeded()
                ? "- **{$model}**: failed ({$trial?->error})"
                : sprintf(
                    '- **%s** [%s, %s]: %s: %s',
                    $model,
                    $trial->result->language ?? '?',
                    $trial->result?->subtype->value ?? '?',
                    implode(', ', $trial->result->tags ?? []),
                    $trial->result->summary ?? '',
                );
        }

        return [...$lines, ''];
    }
}
