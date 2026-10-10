<?php

declare(strict_types=1);

namespace App\Images;

use App\Enums\ColorName;

/**
 * Files the dominant colors of a picture under twelve names, so "red" finds the red shoes even though no pixel is
 * exactly #ff0000. Colors with little weight are ignored, but the strongest one always counts.
 */
final class ColorBuckets
{
    /** A color must cover at least this share of the picture to count (unless it is the strongest). */
    private const MIN_SHARE = 0.1;

    /**
     * @param  list<array{hex: string, pct: float|int}>|null  $colors
     * @return list<ColorName> without repeats, the strongest first
     */
    public static function names(?array $colors): array
    {
        if ($colors === null || $colors === []) {
            return [];
        }

        usort($colors, static fn (array $a, array $b): int => $b['pct'] <=> $a['pct']);

        $names = [];

        foreach ($colors as $position => $color) {
            $name = self::nameOf($color['hex']);

            if ($name !== null && ($position === 0 || $color['pct'] >= self::MIN_SHARE)) {
                $names[$name->value] = $name;
            }
        }

        return array_values($names);
    }

    /**
     * The name of one color. Null for something that is not a hex color.
     */
    public static function nameOf(string $hex): ?ColorName
    {
        return Hsl::fromHex($hex)?->name();
    }
}
