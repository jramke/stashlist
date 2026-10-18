<?php

declare(strict_types=1);

namespace App\Images\Svg;

use App\Images\InvalidImage;
use Dom\Element;

/**
 * Where the picture of an svg is: the view box (where it starts, how wide and how high it is).
 */
final class Box
{
    /**
     * The view box of an svg, or null for none that can be used.
     *
     * @return array{float, float, float, float}|null
     */
    public static function of(Element $svg): ?array
    {
        $number = '('.Value::NUMBER.')';
        $match = [];

        if (
            preg_match(
                "/^\\s*{$number}[\\s,]+{$number}[\\s,]+{$number}[\\s,]+{$number}\\s*$/",
                (string)$svg->getAttribute('viewBox'),
                $match,
            ) !== 1
        ) {
            return null;
        }

        [$x, $y, $width, $height] = [(float)$match[1], (float)$match[2], (float)$match[3], (float)$match[4]];

        return (
            abs($x) <= Value::LIMIT &&
            abs($y) <= Value::LIMIT &&
            $width > 0 &&
            $width <= Value::LIMIT &&
            $height > 0 &&
            $height <= Value::LIMIT
                ? [$x, $y, $width, $height]
                : null
        );
    }

    /**
     * The picture of the outer svg: its view box, or else its plain size. Anything else is no icon.
     *
     * @return array{float, float, float, float}
     *
     * @throws InvalidImage
     */
    public static function root(Element $svg): array
    {
        $width = Value::number($svg->getAttribute('width'));
        $height = Value::number($svg->getAttribute('height'));
        $plain = $width !== null && $height !== null && $width > 0 && $height > 0 ? [0.0, 0.0, $width, $height] : null;

        return self::of($svg) ?? $plain ?? throw InvalidImage::unreadable();
    }
}
