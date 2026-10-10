<?php

declare(strict_types=1);

namespace App\Data\Api;

use App\Models\StashHighlight;
use Carbon\CarbonImmutable;

/**
 * A highlight as the API tells a client about it. The shape is a contract with the extension: add keys, do not
 * rename or drop them. $url_hash is the hash of the stash's normalized address (64 hex characters), which is
 * what a client looks pages up by without telling the server what it browses.
 */
final readonly class HighlightApiData
{
    /**
     * @param  array<string, mixed>|null  $range_hint
     */
    public function __construct(
        public int $id,
        public int $stash_id,
        public ?string $url_hash,
        public string $text,
        public string $prefix,
        public string $suffix,
        public ?int $start_offset,
        public ?array $range_hint,
        public ?string $color,
        public ?string $note,
        public int $revision,
        public string $created_at,
        public string $updated_at,
    ) {}

    /**
     * Build it from a highlight with its `stash` loaded (at least the id and url_hash).
     */
    public static function fromModel(StashHighlight $highlight): self
    {
        return new self(
            id: $highlight->id,
            stash_id: $highlight->stash_id,
            url_hash: self::hex($highlight->stash->url_hash),
            text: $highlight->text,
            prefix: $highlight->prefix,
            suffix: $highlight->suffix,
            start_offset: $highlight->start_offset,
            range_hint: $highlight->range_hint,
            color: $highlight->color,
            note: $highlight->note,
            revision: $highlight->revision,
            created_at: self::time($highlight->created_at),
            updated_at: self::time($highlight->updated_at),
        );
    }

    private static function hex(?string $raw): ?string
    {
        return $raw === null ? null : bin2hex($raw);
    }

    private static function time(?CarbonImmutable $time): string
    {
        return (string)$time?->toIso8601String();
    }
}
