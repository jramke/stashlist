<?php

declare(strict_types=1);

namespace App\Pipeline;

use App\Enums\AiStage;
use App\Enums\AiStatus;
use App\Models\Stash;
use Throwable;

/**
 * What a pipeline job does with a failure of the provider, and how it reports on the stash. For PipelineJob.
 *
 * @require-extends PipelineJob
 */
trait HandlesProviderFailures
{
    /**
     * What to do with a failure depends on what it says: wait and ask again, give up on this stash, or stop all
     * AI work for a while.
     *
     * @throws Throwable when the framework should retry the job with backoff
     */
    protected function handleFailure(Stash $stash, Throwable $failure): void
    {
        $code = PipelineError::code($failure, $this->stage());

        match ($code) {
            // Our key or credit is refused: every job would fail. Hold them all and try again in a while.
            'halted' => $this->hold($stash, $code),
            // The provider said "slow down": a release, not a failure.
            'rate_limited' => $this->release(PipelineError::retryAfter($failure) ?? 60),
            // A server error or a timeout: the framework retries it with backoff.
            'provider_unavailable' => throw $failure,
            default => $this->fail($failure),
        };
    }

    protected function hold(Stash $stash, string $code): void
    {
        AiCircuitBreaker::open('the provider refused our credentials or credit');

        if ($this->isInChain($stash)) {
            $this->mark($stash, AiStatus::Pending, $this->stage(), $code);
        }

        $this->release(300);
    }

    /**
     * Whether the stash is waiting for or in the middle of the chain, as opposed to finished.
     */
    protected function isInChain(Stash $stash): bool
    {
        return $stash->ai_status === AiStatus::Pending || $stash->ai_status === AiStatus::Processing;
    }

    protected function mark(Stash $stash, AiStatus $status, ?AiStage $stage = null, ?string $error = null): void
    {
        Stash::withoutSyncingToSearch(
            static fn () => $stash->forceFill([
                'ai_status' => $status,
                'ai_stage' => $stage,
                'ai_error' => $error,
            ])->save(),
        );
    }
}
