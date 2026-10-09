<?php

declare(strict_types=1);

namespace App\Enums;

enum TagSource: string
{
    case User = 'user';
    /** Any automatic tag: LLM or rule. */
    case Ai = 'ai';
}
