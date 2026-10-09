<?php

declare(strict_types=1);

namespace App\Enums;

enum AiStatus: string
{
    case Skipped = 'skipped';
    case Pending = 'pending';
    case Processing = 'processing';
    case Done = 'done';
    case Failed = 'failed';
}
