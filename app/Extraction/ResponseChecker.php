<?php

declare(strict_types=1);

namespace App\Extraction;

use Psr\Http\Message\ResponseInterface;

/**
 * Turns a final (non-redirect) response into a FetchedResponse, or into the FetchFailed that says why not.
 * Type and size were already enforced when the headers arrived (ContentLimits).
 */
final class ResponseChecker
{
    /**
     * @throws FetchFailed
     */
    public static function accept(string $url, ResponseInterface $response): FetchedResponse
    {
        self::assertSuccessful($response->getStatusCode());

        return new FetchedResponse(
            url: $url,
            status: $response->getStatusCode(),
            contentType: ContentLimits::mediaType($response),
            charset: self::charset($response->getHeaderLine('Content-Type')),
            body: $response->getBody()->getContents(),
        );
    }

    private static function assertSuccessful(int $status): void
    {
        if ($status < 200 || $status >= 300) {
            throw self::failureFor($status);
        }
    }

    /**
     * The failure for a response that is not a success: pages that are gone or closed to us are permanent,
     * timeouts, rate limits and server errors may pass.
     */
    public static function failureFor(int $status): FetchFailed
    {
        if (in_array($status, [401, 403, 404, 410], strict: true)) {
            return FetchFailed::gone($status);
        }

        return FetchFailed::failed(
            "The server answered {$status}.",
            retryable: $status === 408 || $status === 429 || $status >= 500,
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
