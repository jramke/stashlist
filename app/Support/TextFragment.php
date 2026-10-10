<?php

declare(strict_types=1);

namespace App\Support;

/**
 * A link that opens a page at a passage: the browser scrolls to the text and marks it ("scroll to text
 * fragment", the part of the address after #:~:text=). The passage is matched by its words, with the words
 * around it as context to pick the right one when it occurs twice.
 *
 * A long passage is given as its beginning and its end, which the browser takes as the range between them, so
 * the address stays short.
 */
final class TextFragment
{
    /** Characters of a long passage given at each end. */
    private const EDGE = 60;

    /** Passages up to this length go in whole. */
    private const WHOLE = 140;

    /** Words of context kept on each side. */
    private const CONTEXT_WORDS = 3;

    public static function url(string $pageUrl, string $text, string $prefix = '', string $suffix = ''): string
    {
        $text = self::words($text);
        $parts = mb_strlen($text) <= self::WHOLE
            ? [self::encode($text)]
            : [self::encode(self::head($text)), self::encode(self::tail($text))];

        $before = self::lastWords($prefix);
        $after = self::firstWords($suffix);

        $directive =
            ($before === '' ? '' : self::encode($before).'-,').
            implode(',', $parts).
            ($after === '' ? '' : ',-'.self::encode($after));

        return explode('#', $pageUrl, limit: 2)[0].'#:~:text='.$directive;
    }

    private static function words(string $text): string
    {
        return trim((string)preg_replace(pattern: '/\s+/u', replacement: ' ', subject: $text));
    }

    private static function lastWords(string $text): string
    {
        $words = explode(separator: ' ', string: self::words($text));

        return implode(separator: ' ', array: array_slice($words, offset: -self::CONTEXT_WORDS));
    }

    private static function firstWords(string $text): string
    {
        $words = explode(separator: ' ', string: self::words($text));

        return implode(separator: ' ', array: array_slice($words, offset: 0, length: self::CONTEXT_WORDS));
    }

    /**
     * About EDGE characters from the start, cut at a space so no word is split.
     */
    private static function head(string $text): string
    {
        $cut = mb_substr($text, start: 0, length: self::EDGE);
        $space = mb_strrpos($cut, needle: ' ');

        return $space === false ? $cut : mb_substr($cut, start: 0, length: $space);
    }

    /**
     * About EDGE characters from the end, cut at a space so no word is split.
     */
    private static function tail(string $text): string
    {
        $cut = mb_substr($text, start: -self::EDGE);
        $space = mb_strpos($cut, needle: ' ');

        return $space === false ? $cut : mb_substr($cut, start: $space + 1);
    }

    /**
     * Percent-encoded, and also the characters that mean something inside the directive.
     */
    private static function encode(string $part): string
    {
        return str_replace(['-', ',', '&'], ['%2D', '%2C', '%26'], rawurlencode($part));
    }
}
