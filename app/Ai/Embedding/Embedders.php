<?php

declare(strict_types=1);

namespace App\Ai\Embedding;

use InvalidArgumentException;

/**
 * The embedders of the instance, by name. Every entry of config('stashlist.embedders') gives each stash a vector
 * and an embedder in the search index; `search.embedder` says which one queries read from.
 */
final readonly class Embedders
{
    /**
     * @param  array<string, Embedder>  $embedders
     */
    public function __construct(
        private array $embedders,
    ) {}

    public static function fromConfig(): self
    {
        /** @var array<string, Embedder> $embedders */
        $embedders = [];

        foreach (array_keys(config()->array('stashlist.embedders')) as $key) {
            $name = (string)$key;
            $embedders[$name] = new LaravelAiEmbedder(
                $name,
                provider: config()->string("stashlist.embedders.{$name}.provider"),
                model: config()->string("stashlist.embedders.{$name}.model"),
                dimensions: config()->integer("stashlist.embedders.{$name}.dimensions"),
            );
        }

        return new self($embedders);
    }

    /**
     * @return list<string>
     */
    public function names(): array
    {
        return array_keys($this->embedders);
    }

    public function get(string $name): Embedder
    {
        return $this->embedders[$name] ?? throw new InvalidArgumentException("There is no embedder '{$name}'.");
    }

    /**
     * The embedder that queries read from.
     */
    public function forSearch(): Embedder
    {
        return $this->get(config()->string('stashlist.search.embedder'));
    }

    /**
     * @return list<Embedder>
     */
    public function all(): array
    {
        return array_values($this->embedders);
    }
}
