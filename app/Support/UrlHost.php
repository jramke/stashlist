<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Host handling for URL normalization.
 */
final class UrlHost
{
    /**
     * Lowercase, without a trailing dot, internationalized names as punycode. Null when it is no usable host.
     */
    public static function normalize(string $host): ?string
    {
        $host = strtolower(rtrim($host, characters: '.'));

        if ($host === '') {
            return null;
        }

        // Plain ASCII hosts, including IPv6 literals in brackets, are kept as they are.
        if (preg_match('/^[\x21-\x7e]+$/', $host) === 1) {
            return $host;
        }

        $ascii = idn_to_ascii($host, IDNA_DEFAULT, INTL_IDNA_VARIANT_UTS46);

        return $ascii === false ? null : $ascii;
    }
}
