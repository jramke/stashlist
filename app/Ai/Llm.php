<?php

declare(strict_types=1);

namespace App\Ai;

use InvalidArgumentException;

/**
 * A provider and model, as written in STASHLIST_LLM: "openai:gpt-5-mini". The provider names an entry of
 * config/ai.php.
 */
final readonly class Llm
{
    public function __construct(
        public string $provider,
        public string $model,
    ) {}

    public static function configured(): self
    {
        return self::parse(config()->string('stashlist.ai.llm'));
    }

    public static function parse(string $spec): self
    {
        [$provider, $model] = array_pad(explode(separator: ':', string: $spec, limit: 2), length: 2, value: '');

        if ($provider === '' || $model === '') {
            throw new InvalidArgumentException("'{$spec}' is not provider:model.");
        }

        return new self($provider, $model);
    }

    public function name(): string
    {
        return "{$this->provider}:{$this->model}";
    }
}
