<?php

declare(strict_types=1);

namespace App\Extraction;

use Psr\Http\Message\ResponseInterface;

/**
 * The byte cap that applies to a response, decided as soon as its headers arrive: pages and images may differ
 * in size, and an unsupported type or an oversized declared length is refused without downloading the body.
 */
final class ContentLimits
{
    /** Redirects and error pages: only the status matters, so little is read. */
    private const STATUS_ONLY_LIMIT = 65_536;

    /**
     * @param  array<string, int>  $limits  max bytes per media type; "image/*" matches a whole family
     *
     * @throws FetchFailed
     */
    public static function maxBytes(ResponseInterface $response, array $limits): int
    {
        $status = $response->getStatusCode();

        if ($status < 200 || $status >= 300) {
            return self::STATUS_ONLY_LIMIT;
        }

        $type = self::mediaType($response);
        $max = self::limitFor($type, $limits);

        if ($max === null) {
            throw FetchFailed::unsupportedType($type === '' ? 'unknown' : $type);
        }

        $declared = $response->getHeaderLine('Content-Length');

        if ($declared !== '' && (int)$declared > $max) {
            throw FetchFailed::tooLarge();
        }

        return $max;
    }

    public static function mediaType(ResponseInterface $response): string
    {
        return strtolower(trim(explode(';', $response->getHeaderLine('Content-Type'))[0]));
    }

    /**
     * @param  array<string, int>  $limits
     */
    private static function limitFor(string $type, array $limits): ?int
    {
        if (array_key_exists($type, $limits)) {
            return $limits[$type];
        }

        return $limits[explode(separator: '/', string: $type)[0].'/*'] ?? null;
    }
}
