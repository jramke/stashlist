<?php

declare(strict_types=1);

namespace App\Images\Svg;

use Dom\Element;

/**
 * How one svg is put inside another.
 */
final class Nesting
{
    /**
     * The transform that puts the content of an svg inside another svg: where x and y say, scaled from its view box into
     * its width and height (the whole outer picture when it names none) and centered, as `preserveAspectRatio` does by
     * default. Null for an svg with no size.
     */
    public static function transform(Element $svg, float $outerWidth, float $outerHeight): ?string
    {
        $width = Value::number($svg->getAttribute('width')) ?? $outerWidth;
        $height = Value::number($svg->getAttribute('height')) ?? $outerHeight;

        if ($width <= 0 || $height <= 0) {
            return null;
        }

        [$minX, $minY, $boxWidth, $boxHeight] = Box::of($svg) ?? [0.0, 0.0, $width, $height];
        $scale = min($width / $boxWidth, $height / $boxHeight);
        $left = (Value::number($svg->getAttribute('x')) ?? 0.0) + (($width - ($boxWidth * $scale)) / 2);
        $top = (Value::number($svg->getAttribute('y')) ?? 0.0) + (($height - ($boxHeight * $scale)) / 2);

        return sprintf(
            'translate(%s %s) scale(%s)',
            Value::format($left - ($minX * $scale)),
            Value::format($top - ($minY * $scale)),
            Value::format($scale),
        );
    }
}
