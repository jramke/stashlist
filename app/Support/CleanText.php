<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Text from a client we do not control: valid UTF-8 without control characters. Line breaks and tabs stay.
 * It is never rendered as HTML, but a NUL byte or a stray escape code has no business in the database.
 */
final class CleanText
{
    public static function of(string $text): string
    {
        // mb_convert_encoding drops the bytes that are not valid UTF-8; the pattern needs valid input.
        $valid = mb_convert_encoding(string: $text, to_encoding: 'UTF-8', from_encoding: 'UTF-8');

        if (! is_string($valid)) {
            return '';
        }

        $clean = preg_replace(pattern: '/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', replacement: '', subject: $valid);

        return is_string($clean) ? $clean : '';
    }

    public static function nullable(?string $text): ?string
    {
        if ($text === null) {
            return null;
        }

        $clean = self::of($text);

        return trim($clean) === '' ? null : $clean;
    }
}
