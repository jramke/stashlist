<?php

declare(strict_types=1);

namespace App\Enums;

enum AiStage: string
{
    case Extract = 'extract';
    case Enrich = 'enrich';
    case Embed = 'embed';
    case Index = 'index';
}
