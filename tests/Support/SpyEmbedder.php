<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Ai\Embedding\Embedded;
use App\Ai\Embedding\Embedder;
use App\Ai\Embedding\FakeEmbedder;
use Throwable;

/**
 * An embedder that counts its calls and can be told to fail or to answer with a vector of the wrong size.
 */
final class SpyEmbedder implements Embedder
{
    /** @var list<list<string>> the texts of every call */
    public array $calls = [];

    public ?Throwable $failure = null;

    public ?int $answerWithDimensions = null;

    private readonly FakeEmbedder $inner;

    public function __construct(
        private readonly string $name = 'text_v1',
        private readonly int $dimensions = 16,
    ) {
        $this->inner = new FakeEmbedder($name, $dimensions);
    }

    public function name(): string
    {
        return $this->name;
    }

    public function provider(): string
    {
        return $this->inner->provider();
    }

    public function model(): string
    {
        return $this->inner->model();
    }

    public function dimensions(): int
    {
        return $this->dimensions;
    }

    public function embed(array $texts): Embedded
    {
        $this->calls[] = $texts;

        if ($this->failure !== null) {
            throw $this->failure;
        }

        $embedded = $this->inner->embed($texts);

        return $this->answerWithDimensions === null
            ? $embedded
            : new Embedded(array_map(
                fn (): array => array_fill(0, $this->answerWithDimensions ?? 0, value: 0.5),
                $embedded->vectors,
            ), $embedded->tokens);
    }
}
