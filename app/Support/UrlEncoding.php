<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Percent-encoding for URL normalization.
 */
final class UrlEncoding
{
    /**
     * Percent-encodes everything outside printable ASCII (UTF-8 bytes, uppercase hex), like a browser does.
     */
    public static function encodeNonAscii(string $value): string
    {
        return (
            preg_replace_callback(
                '/[^\x21-\x7e]/',
                static fn (array $match): string => rawurlencode($match[0]),
                $value,
            ) ?? $value
        );
    }
}
