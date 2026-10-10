<?php

declare(strict_types=1);

namespace App\Data;

use Carbon\CarbonInterface;
use Laravel\Sanctum\PersonalAccessToken;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * An API token as the settings page lists it. The secret itself is never here: it exists in plain text only
 * once, when it is made (NewTokenData).
 */
#[TypeScript]
final readonly class TokenData
{
    /**
     * @param  list<string>  $abilities
     */
    public function __construct(
        public int $id,
        public string $name,
        public array $abilities,
        public ?string $last_used_at,
        public string $created_at,
    ) {}

    public static function fromModel(PersonalAccessToken $record): self
    {
        /** @var list<string>|null $abilities */
        $abilities = $record->getAttribute('abilities');
        /** @var CarbonInterface|null $lastUsed */
        $lastUsed = $record->getAttribute('last_used_at');
        /** @var CarbonInterface|null $created */
        $created = $record->getAttribute('created_at');

        return new self(
            id: (int)$record->getKey(),
            name: (string)$record->getAttribute('name'),
            abilities: array_values($abilities ?? []),
            last_used_at: $lastUsed?->toIso8601String(),
            created_at: (string)$created?->toIso8601String(),
        );
    }
}
