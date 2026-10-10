<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Ai\AiGuard;
use App\Ai\Embedding\Embedder;
use App\Ai\Embedding\Embedders;
use App\Ai\Embedding\EmbeddingText;
use App\Ai\Embedding\VectorCodec;
use App\Enums\AiStage;
use App\Models\Stash;
use App\Models\StashEmbedding;
use App\Pipeline\AiCircuitBreaker;
use App\Pipeline\PipelineError;
use App\Pipeline\ProviderCall;
use App\Pipeline\UsageRecorder;
use DateTimeInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * Backfills one embedder for a batch of stashes (`stashlist:reembed`): after a change of model or of the text
 * recipe, or when a new embedder is added. One provider call for the whole batch, on the low-priority queue, and
 * the search documents are rebuilt from the stored vectors afterwards.
 *
 * The text is rebuilt from the database, never from the old vectors. Stashes of owners who turned smart features
 * off are left alone, as everywhere.
 */
final class ReembedStashes implements ShouldQueue
{
    use Queueable;

    public int $timeout = 150;

    public int $tries = 0;

    public int $maxExceptions = 4;

    /**
     * @param  list<int>  $stashIds
     */
    public function __construct(
        public readonly array $stashIds,
        public readonly string $embedder,
    ) {
        $this->onQueue('ai-low');
    }

    public function retryUntil(): DateTimeInterface
    {
        return now()->addHours(6);
    }

    /**
     * @return list<int>
     */
    public function backoff(): array
    {
        return [30, 120, 600, 1800];
    }

    /**
     * @return list<object>
     */
    public function middleware(): array
    {
        return [new AiCircuitBreaker, new RateLimited('embed')];
    }

    public function handle(AiGuard $guard, Embedders $embedders, UsageRecorder $recorder): void
    {
        $embedder = $embedders->get($this->embedder);

        if (! $guard->canEmbed($embedder)) {
            return;
        }

        /** @var array<int, array{text: string, user: int}> $items by stash id */
        $items = [];

        foreach (Stash::query()
            ->whereKey($this->stashIds)
            ->with(['enrichment', 'visibleTags', 'highlights'])
            ->get() as $stash) {
            $text = $guard->allows($stash) ? EmbeddingText::of($stash) : '';

            if ($text !== '') {
                $items[$stash->id] = ['text' => $text, 'user' => $stash->user_id];
            }
        }

        if ($items === []) {
            return;
        }

        try {
            $embedded = $embedder->embed(array_column(array_values($items), 'text'));
        } catch (Throwable $failure) {
            $this->handleFailure($failure);

            return;
        }

        $this->store($embedder, $items, $embedded->vectors);
        $this->record($recorder, $embedder, $items, $embedded->tokens);

        // The documents carry the vectors: rebuild them from what is stored.
        Stash::reindex(array_keys($items));
    }

    /**
     * @param  array<int, array{text: string, user: int}>  $items
     * @param  list<list<float>>  $vectors  in the order of $items
     */
    private function store(Embedder $embedder, array $items, array $vectors): void
    {
        $rows = [];
        $position = 0;

        foreach ($items as $stashId => $item) {
            $vector = $vectors[$position++] ?? [];

            if (count($vector) !== $embedder->dimensions()) {
                throw new RuntimeException("The embedder {$embedder->name()} returned a vector of the wrong size.");
            }

            $rows[] = [
                'stash_id' => $stashId,
                'embedder' => $embedder->name(),
                'user_id' => $item['user'],
                'model' => $embedder->model(),
                'dimensions' => $embedder->dimensions(),
                'recipe_version' => EmbeddingText::VERSION,
                'input_hash' => GenerateEmbedding::hash($item['text'], $embedder),
                'vector' => VectorCodec::pack($vector),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        StashEmbedding::query()->upsert(
            $rows,
            ['stash_id', 'embedder'],
            ['user_id', 'model', 'dimensions', 'recipe_version', 'input_hash', 'vector', 'updated_at'],
        );
    }

    /**
     * The tokens of the one call, shared among the owners by how much text each had in it.
     *
     * @param  array<int, array{text: string, user: int}>  $items
     */
    private function record(UsageRecorder $recorder, Embedder $embedder, array $items, int $tokens): void
    {
        $characters = [];
        $counts = [];

        foreach ($items as $item) {
            $characters[$item['user']] = ($characters[$item['user']] ?? 0) + mb_strlen($item['text']);
            $counts[$item['user']] = ($counts[$item['user']] ?? 0) + 1;
        }

        $total = max(1, array_sum($characters));

        foreach ($characters as $userId => $chars) {
            $recorder->batch(
                $userId,
                AiStage::Embed,
                $counts[$userId],
                new ProviderCall(
                    $embedder->provider(),
                    $embedder->model(),
                    (int)round(($tokens * $chars) / $total),
                    tokensOut: 0,
                    inputHash: '',
                ),
            );
        }
    }

    private function handleFailure(Throwable $failure): void
    {
        match (PipelineError::code($failure, AiStage::Embed)) {
            'halted' => $this->hold(),
            'rate_limited' => $this->release(PipelineError::retryAfter($failure) ?? 60),
            default => throw $failure,
        };
    }

    private function hold(): void
    {
        AiCircuitBreaker::open('the provider refused our credentials or credit');
        $this->release(300);
    }

    public function failed(Throwable $exception): void
    {
        // The batch is named by its size only: stash ids and error classes, never text.
        Log::error('Re-embedding a batch failed.', [
            'embedder' => $this->embedder,
            'stashes' => count($this->stashIds),
            'exception' => $exception::class,
        ]);
    }
}
