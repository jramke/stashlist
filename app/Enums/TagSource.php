<?php

declare(strict_types=1);

namespace App\Enums;

use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
enum TagSource: string
{
    case User = 'user';
    /** Any automatic tag: LLM or rule. */
    case Ai = 'ai';
}
