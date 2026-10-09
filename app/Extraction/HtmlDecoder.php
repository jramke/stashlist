<?php

declare(strict_types=1);

namespace App\Extraction;

/**
 * Turns the bytes of an HTML response into UTF-8, whatever the server or the page claim.
 */
final class HtmlDecoder
{
    private const FALLBACK_CHARSET = 'Windows-1252';

    /** Transfer encodings that mbstring lists next to the charsets; asking for their aliases is deprecated. */
    private const NOT_CHARSETS = ['base64', 'uuencode', 'html-entities', 'quoted-printable', '7bit', '8bit'];

    public static function toUtf8(FetchedResponse $response): string
    {
        $body = preg_replace(pattern: '/^\xEF\xBB\xBF/', replacement: '', subject: $response->body) ?? $response->body;
        $charset = $response->charset ?? self::sniffCharset($body);

        if ($charset !== null && self::isSupported($charset)) {
            return self::convert($body, from: $charset);
        }

        return mb_check_encoding($body, encoding: 'UTF-8') ? $body : self::convert($body, from: self::FALLBACK_CHARSET);
    }

    /**
     * The charset a page declares in a <meta> tag near the top.
     */
    private static function sniffCharset(string $body): ?string
    {
        $head = substr($body, offset: 0, length: 4096);

        $match = [];

        return preg_match('/<meta[^>]+charset\s*=\s*["\']?([\w:-]+)/i', $head, $match) === 1 ? $match[1] : null;
    }

    /**
     * Whether mbstring knows the charset name, directly or as an alias ("latin1", "utf8", "shift_jis").
     */
    private static function isSupported(string $charset): bool
    {
        $wanted = strtolower($charset);
        $charsets = array_filter(
            mb_list_encodings(),
            static fn (string $name): bool => ! in_array(strtolower($name), self::NOT_CHARSETS, strict: true),
        );

        return array_any(
            $charsets,
            static fn (string $name): bool => (
                strtolower($name) === $wanted ||
                in_array($wanted, array_map(strtolower(...), mb_encoding_aliases($name)), strict: true)
            ),
        );
    }

    private static function convert(string $body, string $from): string
    {
        $converted = mb_convert_encoding($body, to_encoding: 'UTF-8', from_encoding: $from);

        return is_string($converted) ? $converted : $body;
    }
}
