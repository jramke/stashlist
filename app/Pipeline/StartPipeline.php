<?php

declare(strict_types=1);

namespace App\Pipeline;

use App\Enums\AiStatus;
use App\Enums\StashType;
use App\Jobs\ExtractContent;
use App\Models\Stash;

/**
 * Starts the background work for a new or changed stash. For now that is extraction; the AI stages join the
 * chain with the AI milestone, and until then every stash is "skipped" as far as AI goes.
 */
final class StartPipeline
{
    public function start(Stash $stash): void
    {
        $stash->forceFill(['ai_status' => AiStatus::Skipped, 'ai_stage' => null, 'ai_error' => null])->save();

        // Notes and colors are complete as they are.
        if ($stash->type === StashType::Note || $stash->type === StashType::Color) {
            return;
        }

        dispatch(new ExtractContent($stash->id, $stash->user_id)->afterCommit());
    }

    /**
     * Runs the pipeline again on request ("retry"), extracting even when the content looks unchanged.
     */
    public function restart(Stash $stash): void
    {
        $stash->forceFill(['ai_status' => AiStatus::Skipped, 'ai_stage' => null, 'ai_error' => null])->save();

        if ($stash->type !== StashType::Note && $stash->type !== StashType::Color) {
            dispatch(ExtractContent::forced($stash->id, $stash->user_id)->afterCommit());
        }
    }
}
