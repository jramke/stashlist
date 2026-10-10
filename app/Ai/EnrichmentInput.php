<?php

declare(strict_types=1);

namespace App\Ai;

use App\Enums\StashType;
use App\Models\Stash;
use Illuminate\Support\Str;

/**
 * What the model is shown about a stash: its title, where it lives, the user's own words and as much of the
 * page text as the budget allows. Built from the stash with `enrichment` loaded.
 */
final readonly class EnrichmentInput
{
    /** Below this many characters of material a stash is "short" and needs fewer tags. */
    private const SHORT = 200;

    public function __construct(
        public StashType $type,
        public ?string $title,
        public ?string $domain,
        public ?string $description,
        public ?string $body,
        public ?string $text,
    ) {}

    public static function of(Stash $stash): self
    {
        $budget = config()->integer('stashlist.ai.input_chars');
        $body = $stash->body === null ? null : Str::limit($stash->body, $budget, '');
        $text = $stash->enrichment->extracted_text ?? null;

        return new self(
            type: $stash->type,
            title: $stash->title ?? $stash->enrichment->title ?? null,
            domain: $stash->domain,
            description: $stash->enrichment->description ?? null,
            body: $body,
            text: $text === null ? null : Str::limit($text, max(0, $budget - mb_strlen((string)$body)), ''),
        );
    }

    /**
     * Fingerprint of what the answer depends on: the text, the user's body, the instructions and the model. Not
     * the title (editing it only reindexes) and not the vocabulary (it changes with every stash).
     */
    public function hash(Llm $llm): string
    {
        return hash(
            algo: 'sha256',
            data: (string)json_encode([
                $this->text,
                $this->body,
                config()->integer('stashlist.ai.prompt_version'),
                $llm->name(),
            ]),
        );
    }

    public function isShort(): bool
    {
        return mb_strlen((string)$this->body.(string)$this->text.(string)$this->description) < self::SHORT;
    }

    public function prompt(): string
    {
        $parts = [
            'Kind of item: '.$this->type->value,
            $this->title === null ? null : 'Title: '.$this->title,
            $this->domain === null ? null : 'Address: '.$this->domain,
            $this->description === null ? null : 'Description: '.$this->description,
            $this->body === null
                ? null
                : ($this->type === StashType::Note ? 'Text of the note' : 'Note by the person').":\n".$this->body,
            $this->text === null ? null : "Text of the page:\n".$this->text,
        ];

        return implode("\n\n", array_filter($parts, static fn (?string $part): bool => $part !== null));
    }
}
