<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\AiStage;
use App\Enums\AiStatus;
use App\Models\Stash;
use App\Pipeline\AiCircuitBreaker;
use App\Pipeline\PipelineError;
use App\Pipeline\StartPipeline;
use App\Support\Limits;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Nightly: tries again what failed for a reason that passes (the provider was down, a page timed out) for up
 * to three days, and gives stashes that waited for the monthly cap another chance once the month has turned.
 * What failed for good (a page that is gone, an answer the rules refuse twice) is left to the retry button.
 */
final class RetryFailedStashes implements ShouldQueue
{
    use Queueable;

    private const DAYS = 3;

    public function __construct()
    {
        $this->onQueue('maintenance');
    }

    public function handle(StartPipeline $pipeline, Limits $limits): void
    {
        // Nothing to try while the provider refuses us.
        if (AiCircuitBreaker::isOpen()) {
            return;
        }

        Stash::query()
            ->where(static function (Builder $query): void {
                $query
                    ->where('ai_status', AiStatus::Failed->value)
                    ->whereIn('ai_error', PipelineError::RETRYABLE)
                    ->where('updated_at', '>', now()->subDays(self::DAYS))
                    ->orWhere(static function (Builder $waiting): void {
                        $waiting->where('ai_status', AiStatus::Pending->value)->whereIn('ai_error', [
                            'quota',
                            'halted',
                        ]);
                    });
            })
            ->each(static function (Stash $stash) use ($pipeline, $limits): void {
                if ($stash->ai_error === 'quota' && ! $limits->mayEnrich($stash->user_id)) {
                    return;
                }

                // Extraction failures start from the top, AI failures from the model.
                $stash->ai_stage === AiStage::Extract ? $pipeline->restart($stash) : $pipeline->enrichAgain($stash);
            });
    }
}
