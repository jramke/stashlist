<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\SearchMode;
use App\Models\User;
use App\Search\Eval\EvalScore;
use App\Search\Eval\SearchEval;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use RuntimeException;

#[Signature('stashlist:search-eval
    {--user= : Id of the user whose stashes the eval set refers to}
    {--file= : The eval set, a JSON list of {"q": "...", "expect": [stash ids]} (default: storage/app/search-eval.json)}
    {--mode=both : keyword, hybrid or both}
    {--embedder= : Read queries from this embedder instead of the configured one}
    {--ratio= : Use this semantic ratio for every query}
    {--threshold= : Use this ranking score threshold}')]
#[Description('Score the search on a set of real queries, to compare modes, embedders, ratios and thresholds')]
final class SearchEvalCommand extends Command
{
    public function handle(SearchEval $eval): int
    {
        $user = User::query()->find($this->option('user'));

        if (! $user instanceof User) {
            $this->components->error('Pass the id of an existing user with --user.');

            return self::FAILURE;
        }

        $this->applyOverrides();

        try {
            $cases = $eval->load($this->text('file') ?? storage_path('app/search-eval.json'));
        } catch (RuntimeException $failure) {
            $this->components->error($failure->getMessage());

            return self::FAILURE;
        }

        if ($cases === []) {
            $this->components->error('The eval set has no queries.');

            return self::FAILURE;
        }

        $modes = match ($this->text('mode') ?? 'both') {
            'keyword' => [SearchMode::Keyword],
            'hybrid' => [SearchMode::Hybrid],
            default => [SearchMode::Keyword, SearchMode::Hybrid],
        };

        $rows = [];

        foreach ($modes as $mode) {
            $score = $eval->run($user, $cases, $mode);
            $rows[] = [
                $mode->value,
                number_format($score->recallAt(5), decimals: 2),
                number_format($score->recallAt(10), decimals: 2),
                number_format($score->meanReciprocalRank(), decimals: 2),
                count($score->misses()),
            ];

            $this->misses($mode, $score);
        }

        $this->table(['Mode', 'Recall@5', 'Recall@10', 'MRR', 'Misses'], $rows);

        return self::SUCCESS;
    }

    private function applyOverrides(): void
    {
        $embedder = $this->text('embedder');
        $ratio = $this->text('ratio');
        $threshold = $this->text('threshold');

        config([
            ...($embedder === null ? [] : ['stashlist.search.embedder' => $embedder]),
            ...(
                $ratio === null
                    ? []
                    : ['stashlist.search.ratio' => [
                        'short' => (float)$ratio,
                        'default' => (float)$ratio,
                        'long' => (float)$ratio,
                    ]]
            ),
            ...($threshold === null ? [] : ['stashlist.search.threshold' => (float)$threshold]),
        ]);
    }

    private function misses(SearchMode $mode, EvalScore $score): void
    {
        foreach ($score->misses() as $miss) {
            $this->components->warn(sprintf(
                '[%s] "%s" expected %s, found %s',
                $mode->value,
                $miss['case']->query,
                implode(',', $miss['case']->expected),
                $miss['found'] === [] ? 'nothing' : implode(',', $miss['found']),
            ));
        }
    }

    private function text(string $name): ?string
    {
        $value = $this->option($name);

        return is_scalar($value) && (string)$value !== '' ? (string)$value : null;
    }
}
