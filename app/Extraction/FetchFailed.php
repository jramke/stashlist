<?php

declare(strict_types=1);

namespace App\Extraction;

use RuntimeException;

/**
 * A fetch that went wrong. $reason is the ai_error code; $retryable says whether trying again can help.
 */
final class FetchFailed extends RuntimeException
{
    private function __construct(
        string $message,
        public readonly string $reason,
        public readonly bool $retryable,
        /** The media type that was refused, for a response of a type we do not read. */
        public readonly ?string $mediaType = null,
    ) {
        parent::__construct($message);
    }

    /** The page is gone or closed to us: 401, 403, 404, 410. */
    public static function gone(int $status): self
    {
        return new self("The server answered {$status}.", reason: 'fetch_gone', retryable: false);
    }

    /** Timeouts, connection errors and server errors. */
    public static function failed(string $message, bool $retryable = true): self
    {
        return new self($message, reason: 'fetch_failed', retryable: $retryable);
    }

    public static function tooLarge(): self
    {
        return new self('The response is larger than the limit.', reason: 'fetch_too_large', retryable: false);
    }

    public static function unsupportedType(string $type): self
    {
        return new self(
            "Unsupported content type {$type}.",
            reason: 'unsupported_type',
            retryable: false,
            mediaType: $type,
        );
    }

    public static function tooManyRedirects(): self
    {
        return new self('Too many redirects.', reason: 'fetch_failed', retryable: false);
    }
}
