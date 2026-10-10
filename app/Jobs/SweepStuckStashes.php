<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\AiStatus;
use App\Models\Stash;
use App\Pipeline\StartPipeline;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Every ten minutes: puts back on the queue the stashes whose AI work was lost. A worker killed for memory, a
 * Redis that lost its data: the stash says "processing" or "pending" and nothing will ever move it. Running the
 * stages again is safe, because a stage with unchanged input makes no provider call.
 */
final class SweepStuckStashes implements ShouldQueue
{
    use Queueable;

    private const PROCESSING_MINUTES = 30;

    private const PENDING_MINUTES = 60;

    public function __construct()
    {
        $this->onQueue('maintenance');
    }

    public function handle(StartPipeline $pipeline): void
    {
        Stash::query()
            ->where(static function (Builder $query): void {
                $query
                    ->where(static function (Builder $stuck): void {
                        $stuck
                            ->where('ai_status', AiStatus::Processing->value)
                            ->where('updated_at', '<', now()->subMinutes(self::PROCESSING_MINUTES));
                    })
                    ->orWhere(static function (Builder $waiting): void {
                        // A stash waiting for quota or for the breaker has a reason in ai_error: not stuck.
                        $waiting
                            ->where('ai_status', AiStatus::Pending->value)
                            ->whereNull('ai_error')
                            ->where('updated_at', '<', now()->subMinutes(self::PENDING_MINUTES));
                    });
            })
            ->each($pipeline->enrichAgain(...));
    }
}
