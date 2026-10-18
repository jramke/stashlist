<?php

declare(strict_types=1);

namespace App\Data;

use App\Extraction\Price;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * What a page says a thing costs: the amount as digits with a dot, and its currency as a code when there is one.
 */
#[TypeScript]
final readonly class PriceData
{
    public function __construct(
        public string $amount,
        public ?string $currency,
    ) {}

    /**
     * From what extraction kept in the meta column of a stash; null when there is nothing usable.
     */
    public static function fromMeta(mixed $price): ?self
    {
        $parsed = is_array($price) ? Price::tryFrom($price['amount'] ?? null, $price['currency'] ?? null) : null;

        return $parsed === null ? null : new self($parsed->amount, $parsed->currency);
    }
}
