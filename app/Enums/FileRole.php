<?php

declare(strict_types=1);

namespace App\Enums;

enum FileRole: string
{
    case Original = 'original';
    case Thumb = 'thumb';
    case Preview = 'preview';
    case Screenshot = 'screenshot';
    case Og = 'og';
}
