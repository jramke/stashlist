<?php

declare(strict_types=1);

namespace App\Extraction;

use GuzzleHttp\Psr7\Uri;
use GuzzleHttp\Psr7\UriResolver;
use InvalidArgumentException;

/**
 * An address a page gives, made absolute against the address of the page.
 */
final class AbsoluteUrl
{
    /**
     * An absolute http(s) URL, resolved against the page, or null.
     */
    public static function of(string $base, ?string $reference): ?string
    {
        if ($reference === null || trim($reference) === '') {
            return null;
        }

        try {
            $url = (string)UriResolver::resolve(new Uri($base), new Uri(trim($reference)));
        } catch (InvalidArgumentException) {
            return null;
        }

        return preg_match('#^https?://#i', $url) === 1 ? $url : null;
    }
}
