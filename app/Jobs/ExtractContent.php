<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\AiStage;
use App\Enums\AiStatus;
use App\Extraction\BlockedUrl;
use App\Extraction\ContentExtractor;
use App\Extraction\ExtractionRecorder;
use App\Extraction\FetchFailed;
use App\Images\InvalidImage;
use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Pipeline\PipelineError;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Throwable;

/**
 * Pipeline stage 1: look at what a stash points to (fetch the page or image, make thumbnails, read the text)
 * and record it in the stash's enrichment. Local work only, so it runs whatever the user's smart-feature setting.
 *
 * The job carries ids, never content. A failure that cannot be fixed by waiting marks the stash as failed
 * (it stays saved and findable as a bare link); a timeout or a server error is tried again a few times.
 */
final class ExtractContent implements ShouldQueue
{
    use Queueable;

    public int $timeout = 90;

    public int $tries = 4;

    /** Extract again even when the fetched content is the same as last time. */
    public bool $force = false;

    public function __construct(
        public readonly int $stashId,
        public readonly int $userId,
    ) {
        $this->onQueue('scrape');
    }

    public static function forced(int $stashId, int $userId): self
    {
        $job = new self($stashId, $userId);
        $job->force = true;

        return $job;
    }

    /**
     * @return list<WithoutOverlapping>
     */
    public function middleware(): array
    {
        return [new WithoutOverlapping("stash:{$this->stashId}")->releaseAfter(30)];
    }

    /**
     * @return list<int> seconds to wait before attempt 2, 3 and 4
     */
    public function backoff(): array
    {
        return [30, 120, 600];
    }

    public function handle(ContentExtractor $extractor, ExtractionRecorder $recorder): void
    {
        $stash = $this->stash();

        // Deleted meanwhile: nothing left to do.
        if ($stash === null) {
            return;
        }

        try {
            $result = $extractor->extract($stash, $this->force ? null : $this->previousHash($stash));
        } catch (FetchFailed $failure) {
            $this->retryOrFail($failure);

            return;
        } catch (BlockedUrl|InvalidImage $failure) {
            $this->fail($failure);

            return;
        }

        if ($result !== null) {
            $recorder->record($stash, $result);
        }
    }

    public function failed(Throwable $exception): void
    {
        $this
            ->stash()
            ?->forceFill([
                'ai_status' => AiStatus::Failed,
                'ai_stage' => AiStage::Extract,
                'ai_error' => PipelineError::code($exception),
            ])
            ->save();
    }

    private function stash(): ?Stash
    {
        return Stash::query()->where('user_id', $this->userId)->find($this->stashId);
    }

    private function previousHash(Stash $stash): ?string
    {
        return StashEnrichment::query()->find($stash->id)?->extract_hash;
    }

    private function retryOrFail(FetchFailed $failure): void
    {
        if ($failure->retryable && $this->attempts() < $this->tries) {
            $this->release($this->backoff()[$this->attempts() - 1] ?? 600);

            return;
        }

        $this->fail($failure);
    }
}
