<?php

declare(strict_types=1);

namespace App\Support;

/**
 * The one definition of "the same URL", used to dedupe links per user (stashes.url_hash).
 *
 * The rules are written down in tests/fixtures/url-normalization.json, which the PHP tests and,
 * later, the browser extension's tests both run. Change the rules and the fixture together.
 */
final class UrlNormalizer
{
    /**
     * @return string|null the normalized URL, or null when this is not a plain http(s) web URL
     */
    public static function normalize(string $url): ?string
    {
        $url = trim($url);

        if (str_starts_with($url, '//')) {
            $url = 'https:'.$url;
        }

        $parts = UrlParts::parse($url);

        if ($parts === null) {
            return null;
        }

        return $parts->scheme.'://'.$parts->authority().$parts->path.$parts->queryString();
    }

    /**
     * Raw sha256 of the normalized URL: the value of stashes.url_hash.
     */
    public static function hash(string $normalized): string
    {
        return hash(algo: 'sha256', data: $normalized, binary: true);
    }
}
