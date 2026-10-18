<?php

declare(strict_types=1);

namespace App\Images\Svg;

use ImagickPixel;
use ImagickPixelException;

/**
 * The colors an SVG may use: hex, `rgb()` and the names ImageMagick knows. A color is written out again as `#rrggbb`;
 * transparency is left off, because the icon is drawn on the card.
 */
final class Color
{
    /** Words that are not the name of a color, although they look like one. */
    private const NOT_COLORS = ['none', 'inherit', 'initial', 'unset', 'revert', 'auto', 'currentcolor', 'transparent'];

    /**
     * A color as `#rrggbb`, or the name of one (ImageMagick knows the names and refuses what it does not, so a word like
     * `url` or `calc` is no color), or null.
     */
    public static function of(?string $value): ?string
    {
        $rgb = self::rgb($value);

        if ($rgb !== null) {
            return sprintf('#%02x%02x%02x', $rgb[0], $rgb[1], $rgb[2]);
        }

        $name = strtolower(trim((string)$value));

        if (preg_match('/^[a-z]{3,20}$/', $name) !== 1 || in_array($name, self::NOT_COLORS, strict: true)) {
            return null;
        }

        try {
            new ImagickPixel($name);
        } catch (ImagickPixelException) {
            return null;
        }

        return $name;
    }

    /**
     * The red, green and blue of a hex color or of `rgb()`, or null for a name or anything else.
     *
     * @return array{int, int, int}|null
     */
    public static function rgb(?string $value): ?array
    {
        $text = trim((string)$value);
        $match = [];

        if (preg_match('/^#([0-9a-f]{3,8})$/i', $text, $match) === 1) {
            return self::hex($match[1]);
        }

        $channel = '(\d{1,3}(?:\.\d+)?%?)';

        if (
            preg_match(
                "/^rgba?\\(\\s*{$channel}[\\s,]+{$channel}[\\s,]+{$channel}(?:[\\s,\\/]+[\\d.]+%?)?\\s*\\)$/i",
                $text,
                $match,
            ) !== 1
        ) {
            return null;
        }

        $channels = array_map(
            static fn (string $part): int => (int)max(
                0,
                min(255, round(str_ends_with($part, '%') ? ((float)$part * 255) / 100 : (float)$part)),
            ),
            array_slice($match, offset: 1, length: 3),
        );

        return [$channels[0], $channels[1], $channels[2]];
    }

    /**
     * @return array{int, int, int}|null
     */
    private static function hex(string $digits): ?array
    {
        $full = match (strlen($digits)) {
            3, 4 => $digits[0].$digits[0].$digits[1].$digits[1].$digits[2].$digits[2],
            6, 8 => substr($digits, offset: 0, length: 6),
            default => null,
        };

        return (
            $full === null
                ? null
                : [
                    (int)hexdec(substr($full, offset: 0, length: 2)),
                    (int)hexdec(substr($full, offset: 2, length: 2)),
                    (int)hexdec(substr($full, offset: 4, length: 2)),
                ]
        );
    }
}
