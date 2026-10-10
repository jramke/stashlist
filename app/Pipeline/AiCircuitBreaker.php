<?php

declare(strict_types=1);

namespace App\Pipeline;

use App\Jobs\ReembedStashes;
use Closure;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Stops AI work for a while when the provider refuses us as a whole (our key is wrong, the credit is gone, or
 * the day's budget is spent). It is a flag in the cache: while it is set, AI jobs put themselves back on the
 * queue instead of failing, so nothing is lost and nobody has to pause a queue by hand.
 *
 * Used as job middleware on the AI jobs.
 */
final class AiCircuitBreaker
{
    private const KEY = 'ai:halted';

    /** Seconds an AI job waits before looking at the breaker again. */
    private const RECHECK = 300;

    public static function open(string $reason): void
    {
        $minutes = config()->integer('stashlist.ai.breaker_minutes');

        Cache::put(self::KEY, $reason, now()->addMinutes($minutes));

        // The operator's notification: a critical line in the log (and so in whatever watches it).
        Log::critical("AI calls halted for {$minutes} minutes: {$reason}");
    }

    public static function isOpen(): bool
    {
        return Cache::has(self::KEY);
    }

    public static function close(): void
    {
        Cache::forget(self::KEY);
    }

    public static function reason(): ?string
    {
        return Cache::has(self::KEY) ? Cache::string(self::KEY) : null;
    }

    public function handle(PipelineJob|ReembedStashes $job, Closure $next): mixed
    {
        if (self::isOpen()) {
            $job->release(self::RECHECK);

            return null;
        }

        return $next($job);
    }
}
