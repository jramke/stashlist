<?php

declare(strict_types=1);

namespace App\Extraction;

use RuntimeException;

/**
 * A URL the server refuses to fetch. Permanent: the stash stays a bare link (ai_error fetch_blocked).
 */
final class BlockedUrl extends RuntimeException
{
    public const REASON = 'fetch_blocked';

    public static function malformed(): self
    {
        return new self('The URL could not be parsed.');
    }

    public static function scheme(): self
    {
        return new self('Only http and https URLs without credentials are fetched.');
    }

    public static function port(): self
    {
        return new self('Only ports 80 and 443 are fetched.');
    }

    public static function host(): self
    {
        return new self('The URL has no usable host.');
    }

    public static function private(): self
    {
        return new self('The host does not resolve to public addresses only.');
    }
}
