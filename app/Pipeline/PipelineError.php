<?php

declare(strict_types=1);

namespace App\Pipeline;

use App\Ai\EnrichmentInvalid;
use App\Ai\EnrichmentRefused;
use App\Enums\AiStage;
use App\Extraction\BlockedUrl;
use App\Extraction\FetchFailed;
use App\Images\InvalidImage;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Laravel\Ai\Exceptions\InsufficientCreditsException;
use Laravel\Ai\Exceptions\ProviderConnectionException;
use Laravel\Ai\Exceptions\ProviderOverloadedException;
use Laravel\Ai\Exceptions\RateLimitedException;
use Throwable;

/**
 * Maps what went wrong in a pipeline job to the short code stored in stashes.ai_error, and says which of them
 * are worth trying again later.
 */
final class PipelineError
{
    /** Waiting helps with these: the nightly retry job picks them up for a few days. */
    public const RETRYABLE = ['provider_unavailable', 'rate_limited', 'halted', 'fetch_failed', 'quota'];

    public static function code(Throwable $exception, AiStage $stage = AiStage::Extract): string
    {
        $status = self::status($exception);

        return match (true) {
            $exception instanceof FetchFailed => $exception->reason,
            $exception instanceof BlockedUrl => BlockedUrl::REASON,
            $exception instanceof InvalidImage => $exception->reason,
            $exception instanceof EnrichmentRefused => 'llm_refused',
            $exception instanceof EnrichmentInvalid => 'llm_invalid',
            $exception instanceof InsufficientCreditsException,
            $status === 401,
            $status === 402,
            $status === 403,
                => 'halted',
            $exception instanceof RateLimitedException || $status === 429 => 'rate_limited',
            $exception instanceof ProviderOverloadedException,
            $exception instanceof ProviderConnectionException,
            $exception instanceof ConnectionException,
            $status === 408,
            $status === 409,
            $status !== null && $status >= 500,
                => 'provider_unavailable',
            $stage === AiStage::Enrich => 'llm_failed',
            $stage === AiStage::Embed => 'embed_failed',
            default => 'extract_failed',
        };
    }

    /**
     * Whether trying again later can work.
     */
    public static function isRetryable(string $code): bool
    {
        return in_array($code, self::RETRYABLE, strict: true);
    }

    /**
     * A short text for the run log. Provider errors can quote the request, which holds page text, so only the
     * class of an unknown error and the status of an HTTP one are kept.
     */
    public static function message(Throwable $exception): string
    {
        $status = self::status($exception);

        return match (true) {
            $exception instanceof EnrichmentInvalid => mb_substr($exception->getMessage(), start: 0, length: 500),
            $status !== null => "HTTP {$status}",
            default => $exception::class,
        };
    }

    /**
     * Seconds the provider asked us to wait, when it said so.
     */
    public static function retryAfter(Throwable $exception): ?int
    {
        $request = self::request($exception);
        $header = $request === null ? '' : $request->response->header('Retry-After');

        return ctype_digit($header) ? (int)$header : null;
    }

    private static function request(Throwable $exception): ?RequestException
    {
        $previous = $exception->getPrevious();

        return match (true) {
            $exception instanceof RequestException => $exception,
            $previous instanceof RequestException => $previous,
            default => null,
        };
    }

    private static function status(Throwable $exception): ?int
    {
        $request = self::request($exception);

        return $request === null ? null : $request->response->status();
    }
}
