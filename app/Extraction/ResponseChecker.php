<?php

declare(strict_types=1);

namespace App\Extraction;

use Psr\Http\Message\ResponseInterface;

/**
 * Turns a final (non-redirect) response into a FetchedResponse, or into the FetchFailed that says why not.
 */
final class ResponseChecker
{
    /**
     * @param  list<string>  $accept
     *
     * @throws FetchFailed
     */
    public static function accept(
        string $url,
        ResponseInterface $response,
        int $maxBytes,
        array $accept,
    ): FetchedResponse {
        self::assertSuccessful($response->getStatusCode());

        $contentType = strtolower(trim(explode(';', $response->getHeaderLine('Content-Type'))[0]));

        if (! self::matches($contentType, $accept)) {
            throw FetchFailed::unsupportedType($contentType === '' ? 'unknown' : $contentType);
        }

        $declared = $response->getHeaderLine('Content-Length');

        if ($declared !== '' && (int)$declared > $maxBytes) {
            throw FetchFailed::tooLarge();
        }

        return new FetchedResponse(
            url: $url,
            status: $response->getStatusCode(),
            contentType: $contentType,
            charset: self::charset($response->getHeaderLine('Content-Type')),
            body: $response->getBody()->getContents(),
        );
    }

    private static function assertSuccessful(int $status): void
    {
        if ($status >= 200 && $status < 300) {
            return;
        }

        if (in_array($status, [401, 403, 404, 410], strict: true)) {
            throw FetchFailed::gone($status);
        }

        throw FetchFailed::failed(
            "The server answered {$status}.",
            retryable: $status === 408 || $status === 429 || $status >= 500,
        );
    }

    /**
     * @param  list<string>  $accept
     */
    private static function matches(string $contentType, array $accept): bool
    {
        return array_any(
            $accept,
            static fn (string $allowed): bool => (
                $allowed === $contentType ||
                str_ends_with($allowed, '/*') && str_starts_with($contentType, substr($allowed, offset: 0, length: -1))
            ),
        );
    }

    private static function charset(string $contentTypeHeader): ?string
    {
        $match = [];

        return preg_match('/charset\s*=\s*"?([\w.:-]+)"?/i', $contentTypeHeader, $match) === 1
            ? strtolower($match[1])
            : null;
    }
}
