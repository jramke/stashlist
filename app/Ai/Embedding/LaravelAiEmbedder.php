<?php

declare(strict_types=1);

namespace App\Ai\Embedding;

use Laravel\Ai\Embeddings;

/**
 * The embedder of an entry of config('stashlist.embedders'), served by the Laravel AI SDK: OpenAI, Gemini, Cohere,
 * Voyage, Jina, Mistral or any openai-compatible endpoint, by changing the provider and model in config.
 *
 * Only App\Ai calls the SDK for embeddings (an architecture test keeps it so), and only after the AiGuard.
 */
final readonly class LaravelAiEmbedder implements Embedder
{
    public function __construct(
        private string $name,
        private string $provider,
        private string $model,
        private int $dimensions,
    ) {}

    public function name(): string
    {
        return $this->name;
    }

    public function provider(): string
    {
        return $this->provider;
    }

    public function model(): string
    {
        return $this->model;
    }

    public function dimensions(): int
    {
        return $this->dimensions;
    }

    public function embed(array $texts): Embedded
    {
        $response = Embeddings::for($texts)->dimensions($this->dimensions)->generate($this->provider, $this->model);

        return new Embedded(
            vectors: array_values(array_map(
                static fn (array $vector): array => array_values(array_map(floatval(...), $vector)),
                $response->embeddings,
            )),
            tokens: $response->usage->inputTokens,
        );
    }
}
