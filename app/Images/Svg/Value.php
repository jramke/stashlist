<?php

declare(strict_types=1);

namespace App\Images\Svg;

/**
 * What the values of an SVG may be. A number is one an icon can have; a path, a list of points and a list of transforms
 * are made of the characters of their kind and of numbers like that, and of nothing else. What passes is handed on as it
 * was written, and it can hold no word, no quote and no address.
 */
final class Value
{
    /** The largest number a coordinate, a length or a transform may hold; a document that needs more is no icon. */
    public const LIMIT = 1_000_000;

    public const NUMBER = '[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?';

    public const PATH = '/^[MmZzLlHhVvCcSsQqTtAa0-9eE.,+\-\s]+$/';

    public const POINTS = '/^[0-9eE.,+\-\s]+$/';

    public const TRANSFORMS = '/^\s*'.self::TRANSFORM.'(?:\s*,?\s*'.self::TRANSFORM.')*\s*$/';

    private const TRANSFORM =
        '(?:matrix|translate|scale|rotate|skewX|skewY)\s*\(\s*(?:'.
            self::NUMBER.
            '(?:\s*,\s*|\s+))*'.
            self::NUMBER.
            '\s*\)';

    /**
     * A number, with the unit `px` or none, that is no larger than an icon can use.
     */
    public static function number(?string $value): ?float
    {
        $match = [];
        $number = preg_match('/^\s*('.self::NUMBER.')(?:px)?\s*$/', (string)$value, $match) === 1
            ? (float)$match[1]
            : null;

        return $number !== null && abs($number) <= self::LIMIT ? $number : null;
    }

    public static function format(float $number): string
    {
        return rtrim(rtrim(sprintf('%.6F', $number), characters: '0'), characters: '.');
    }

    /**
     * An opacity, from 0 to 1 or in percent, as a number from 0 to 1.
     */
    public static function opacity(?string $value): ?string
    {
        $text = trim((string)$value);
        $percent = str_ends_with($text, '%');
        $number = self::number($percent ? substr($text, offset: 0, length: -1) : $text);

        return $number === null ? null : self::format(max(0.0, min(1.0, $percent ? $number / 100 : $number)));
    }

    /**
     * The text, trimmed, when it is short, made of the characters the pattern allows and holds no number that is too large.
     */
    public static function checked(?string $value, string $pattern, int $longest): ?string
    {
        $numbers = [];

        if ($value === null || strlen($value) > $longest || preg_match($pattern, $value) !== 1) {
            return null;
        }

        preg_match_all('/'.self::NUMBER.'/', $value, $numbers);

        return array_all($numbers[0], static fn (string $number): bool => abs((float)$number) <= self::LIMIT)
            ? trim($value)
            : null;
    }
}
