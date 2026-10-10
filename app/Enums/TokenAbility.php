<?php

declare(strict_types=1);

namespace App\Enums;

use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * What an API token may do (plan 6.3). Tokens made in the settings get all of them, one token per client;
 * a client that only searches could get fewer later.
 */
#[TypeScript]
enum TokenAbility: string
{
    case Create = 'stash:create';
    case Read = 'stash:read';
    case Search = 'stash:search';
    case Highlight = 'highlight:manage';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $ability): string => $ability->value, self::cases());
    }
}
