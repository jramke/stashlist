<?php

declare(strict_types=1);

namespace App\Tags;

use Normalizer;

/**
 * The one definition of what a tag name is: the display form the user sees and the slug that identifies it.
 */
final class TagNormalizer
{
    public const MAX_LENGTH = 64;

    /**
     * Display form: Unicode NFKC, no control characters, single spaces, no leading '#', at most 64 characters.
     * Null when nothing is left.
     */
    public static function name(string $input): ?string
    {
        $name = Normalizer::normalize($input, Normalizer::NFKC);
        $name =
            preg_replace(pattern: '/\p{C}+/u', replacement: ' ', subject: $name === false ? $input : $name) ?? $input;
        $name = preg_replace(pattern: '/\s+/u', replacement: ' ', subject: $name) ?? $name;
        $name = trim(ltrim(trim($name), characters: '#'));
        $name = trim(mb_substr($name, start: 0, length: self::MAX_LENGTH));

        return $name === '' ? null : $name;
    }

    /**
     * The key of a tag within one user's tags: the display form in lowercase.
     */
    public static function slug(string $name): string
    {
        return mb_substr(mb_strtolower($name), start: 0, length: self::MAX_LENGTH);
    }
}
