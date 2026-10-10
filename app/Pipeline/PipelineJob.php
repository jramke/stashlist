<?php

declare(strict_types=1);

namespace App\Pipeline;

use App\Enums\AiStage;
use App\Enums\AiStatus;
use App\Jobs\IndexStash;
use App\Models\Stash;
use DateTimeInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Throwable;

/**
 * Base of the stages that call a provider. The job carries two ids and no content: it reads the stash when it
 * runs, so a stash that was deleted or edited meanwhile is handled with what is there now.
 *
 * It is tried for six hours, backing off from half a minute to half an hour. A release (the provider or our
 * own limiter said "later") is not an error and does not count against the four failures it is allowed.
 * A job that fails for good marks the stash and still queues the index write, so the text that extraction
 * found stays searchable.
 */
abstract class PipelineJob implements ShouldQueue
{
    use HandlesProviderFailures, Queueable;

    public int $timeout = 150;

    /** Unlimited tries; retryUntil() and maxExceptions are the limits. */
    public int $tries = 0;

    public int $maxExceptions = 4;

    public function __construct(
        public readonly int $stashId,
        public readonly int $userId,
    ) {
        $this->onQueue('ai');
    }

    abstract protected function stage(): AiStage;

    /**
     * The name of the rate limiter for calls of this kind, shared by all users.
     */
    abstract protected function limiter(): string;

    public function retryUntil(): DateTimeInterface
    {
        return now()->addHours(6);
    }

    /**
     * @return list<int>
     */
    public function backoff(): array
    {
        return [30, 120, 600, 1800];
    }

    /**
     * @return list<object>
     */
    public function middleware(): array
    {
        return [
            new WithoutOverlapping("stash:{$this->stashId}")->releaseAfter(30),
            new AiCircuitBreaker,
            new RateLimited('user-ai'),
            new RateLimited($this->limiter()),
        ];
    }

    public function failed(Throwable $exception): void
    {
        $stash = $this->stash();

        if ($stash === null) {
            return;
        }

        app(UsageRecorder::class)->failed(
            $stash,
            $this->stage(),
            Attempt::unknown($this->job?->attempts() ?? 1),
            $exception,
        );

        // A stage that runs on its own (a refresh after a tag changed) must not turn a finished stash into a
        // failed one; only a stage of the chain reports back to the person.
        if (! $this->isInChain($stash)) {
            return;
        }

        $stash->forceFill([
            'ai_status' => AiStatus::Failed,
            'ai_stage' => $this->stage(),
            'ai_error' => PipelineError::code($exception, $this->stage()),
        ])->save();

        dispatch(new IndexStash($this->stashId, $this->userId));
    }

    protected function stash(): ?Stash
    {
        return Stash::query()->where('user_id', $this->userId)->find($this->stashId);
    }
}
