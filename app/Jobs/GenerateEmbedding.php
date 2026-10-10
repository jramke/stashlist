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
use App\Pipeline\Attempt;
use App\Pipeline\PipelineJob;
use App\Pipeline\ProviderCall;
use App\Pipeline\UsageRecorder;
use RuntimeException;
use Throwable;

/**
 * Pipeline stage 3: make the vector of a stash for every embedder of the instance and store it. Skipped without a
 * call when the text it is made from has not changed, when the owner has smart features off, and for an embedder
 * whose provider has no key.
 *
 * It runs after the model stage, and on its own (after a tag or a highlight changed the text, see
 * RefreshEmbedding), where it does not touch the stash's status.
 */
final class GenerateEmbedding extends PipelineJob
{
    protected function stage(): AiStage
    {
        return AiStage::Embed;
    }

    protected function limiter(): string
    {
        return 'embed';
    }

    public function handle(AiGuard $guard, Embedders $embedders, UsageRecorder $recorder): void
    {
        $stash = $this->stash();

        // Deleted meanwhile, or the owner turned smart features off after this was queued: nothing to do.
        if ($stash === null || ! $guard->allows($stash)) {
            return;
        }

        $stash->load(['enrichment', 'visibleTags', 'highlights']);
        $text = EmbeddingText::of($stash);

        if ($text === '') {
            return;
        }

        foreach ($embedders->all() as $embedder) {
            if (! $guard->canEmbed($embedder)) {
                continue;
            }

            $this->embed($stash, $embedder, $text, $recorder);
        }
    }

    private function embed(Stash $stash, Embedder $embedder, string $text, UsageRecorder $recorder): void
    {
        $hash = self::hash($text, $embedder);
        $attempt = Attempt::begin($this->attempts());
        $stored = (string)StashEmbedding::query()
            ->where('stash_id', $stash->id)
            ->where('embedder', $embedder->name())
            ->value('input_hash');

        if ($stored === $hash) {
            $recorder->skipped($stash, AiStage::Embed, $attempt, $hash);

            return;
        }

        try {
            $embedded = $embedder->embed([$text]);
            $vector = $embedded->vectors[0] ?? [];

            // A vector of the wrong size would make the search index reject the whole document, later and silently.
            if (count($vector) !== $embedder->dimensions()) {
                throw new RuntimeException(
                    "The embedder {$embedder->name()} returned ".
                    count($vector).
                    " dimensions, not {$embedder->dimensions()}.",
                );
            }
        } catch (Throwable $failure) {
            $this->handleFailure($stash, $failure);

            return;
        }

        StashEmbedding::query()->upsert(
            [
                [
                    'stash_id' => $stash->id,
                    'embedder' => $embedder->name(),
                    'user_id' => $stash->user_id,
                    'model' => $embedder->model(),
                    'dimensions' => $embedder->dimensions(),
                    'recipe_version' => EmbeddingText::VERSION,
                    'input_hash' => $hash,
                    'vector' => VectorCodec::pack($vector),
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ],
            ['stash_id', 'embedder'],
            ['user_id', 'model', 'dimensions', 'recipe_version', 'input_hash', 'vector', 'updated_at'],
        );

        $recorder->succeeded(
            $stash,
            AiStage::Embed,
            $attempt,
            new ProviderCall(
                $embedder->provider(),
                $embedder->model(),
                $embedded->tokens,
                tokensOut: 0,
                inputHash: $hash,
            ),
        );
    }

    /**
     * What a stored vector depends on: the text, the recipe that made it, and the model and size.
     */
    public static function hash(string $text, Embedder $embedder): string
    {
        return hash(
            algo: 'sha256',
            data: (string)json_encode([$text, EmbeddingText::VERSION, $embedder->model(), $embedder->dimensions()]),
        );
    }
}
