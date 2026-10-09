<?php

declare(strict_types=1);

namespace App\Pipeline;

use App\Extraction\BlockedUrl;
use App\Extraction\FetchFailed;
use App\Images\InvalidImage;
use Throwable;

/**
 * Maps what went wrong in a pipeline job to the short code stored in stashes.ai_error.
 */
final class PipelineError
{
    public static function code(Throwable $exception): string
    {
        return match (true) {
            $exception instanceof FetchFailed => $exception->reason,
            $exception instanceof BlockedUrl => BlockedUrl::REASON,
            $exception instanceof InvalidImage => $exception->reason,
            default => 'extract_failed',
        };
    }
}
