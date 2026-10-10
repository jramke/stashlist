<?php

declare(strict_types=1);

namespace App\Ai\Bakeoff;

use App\Ai\Enricher;
use App\Ai\Llm;
use App\Ai\Prices;
use App\Enums\AiStage;
use App\Enums\StashType;
use App\Models\Stash;
use App\Pipeline\PipelineError;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Throwable;

/**
 * Runs the same stashes through several models and keeps every answer, so the default model is chosen from
 * data. Reads only: nothing is saved to the stashes, and the enricher's guard still decides which may be sent.
 */
final class Bakeoff
{
    public function __construct(
        private readonly Enricher $enricher,
    ) {}

    /**
     * A sample of the user's stashes the model has something to read in: links with extracted text, notes.
     *
     * @return Collection<int, Stash>
     */
    public function sample(int $userId, int $count, ?int $seed = null): Collection
    {
        return Stash::query()
            ->where('user_id', $userId)
            ->whereIn('type', [StashType::Link->value, StashType::Note->value])
            ->where(static function (Builder $query): void {
                $query
                    ->whereHas('enrichment', static fn (Builder $enrichment) => $enrichment->whereNotNull(
                        'extracted_text',
                    ))
                    ->orWhereNotNull('body');
            })
            ->with('enrichment')
            ->inRandomOrder($seed ?? '')
            ->limit($count)
            ->get();
    }

    /**
     * @param  Collection<int, Stash>  $stashes
     * @param  list<Llm>  $models
     * @return list<Trial>
     */
    public function run(Collection $stashes, array $models): array
    {
        $trials = [];

        foreach ($stashes as $stash) {
            foreach ($models as $llm) {
                $trials[] = $this->try($stash, $llm);
            }
        }

        return $trials;
    }

    private function try(Stash $stash, Llm $llm): Trial
    {
        $started = hrtime(as_number: true);

        try {
            $enrichment = $this->enricher->enrich($stash, $llm);
        } catch (Throwable $failure) {
            return new Trial(
                $stash->id,
                $llm->name(),
                result: null,
                call: null,
                error: PipelineError::code($failure, AiStage::Enrich),
                milliseconds: self::since($started),
                costMicros: 0,
            );
        }

        return new Trial(
            $stash->id,
            $llm->name(),
            $enrichment->result,
            $enrichment->call,
            error: null,
            milliseconds: self::since($started),
            costMicros: Prices::cost($llm->model, $enrichment->call->tokensIn, $enrichment->call->tokensOut),
        );
    }

    private static function since(int|float $started): int
    {
        return (int)round((hrtime(as_number: true) - $started) / 1_000_000);
    }
}
