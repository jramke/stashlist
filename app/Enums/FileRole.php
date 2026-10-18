<?php

declare(strict_types=1);

namespace App\Enums;

enum FileRole: string
{
    case Original = 'original';
    case Thumb = 'thumb';

    /** The thumbnail at the size a card is shown at on a screen of ordinary density. */
    case ThumbSmall = 'thumb_small';

    case Preview = 'preview';
    case Screenshot = 'screenshot';
    case Og = 'og';
}
