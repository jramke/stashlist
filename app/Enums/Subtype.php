<?php

declare(strict_types=1);

namespace App\Enums;

use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * What kind of thing a link or note is, as far as the machine can tell. `stashes.subtype` is a plain string
 * because extraction sets some of them by rule; this is the list the model may choose from.
 */
#[TypeScript]
enum Subtype: string
{
    case Article = 'article';
    case Product = 'product';
    case Video = 'video';
    case Social = 'social';
    case Repo = 'repo';
    case Paper = 'paper';
    case Recipe = 'recipe';
    case Quote = 'quote';
    case Other = 'other';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $case): string => $case->value, self::cases());
    }
}
