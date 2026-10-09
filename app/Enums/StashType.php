<?php

declare(strict_types=1);

namespace App\Enums;

enum StashType: string
{
    case Link = 'link';
    case Note = 'note';
    case Image = 'image';
    case File = 'file';
    case Color = 'color';
}
