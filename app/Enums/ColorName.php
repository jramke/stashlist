<?php

declare(strict_types=1);

namespace App\Enums;

use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * The twelve names a picture's colors are filed under, for the color filter. The value is also the CSS-ish
 * name the interface shows next to a swatch.
 */
#[TypeScript]
enum ColorName: string
{
    case Red = 'red';
    case Orange = 'orange';
    case Yellow = 'yellow';
    case Green = 'green';
    case Teal = 'teal';
    case Blue = 'blue';
    case Purple = 'purple';
    case Pink = 'pink';
    case Brown = 'brown';
    case Black = 'black';
    case White = 'white';
    case Gray = 'gray';
}
