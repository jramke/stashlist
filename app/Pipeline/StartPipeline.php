<?php

declare(strict_types=1);

namespace App\Pipeline;

use App\Enums\AiStatus;
use App\Enums\StashType;
use App\Jobs\ExtractContent;
use App\Jobs\IndexStash;
use App\Models\Stash;

/**
 * Starts the background work for a new or changed stash: extraction first (links and images only), then the
 * search index. The AI stages join the chain with the AI milestone, and until then every stash is "skipped" as
 * far as AI goes.
 */
final class StartPipeline
{
    public function start(Stash $stash): void
    {
        $this->run($stash, new ExtractContent($stash->id, $stash->user_id));
    }

    /**
     * Runs the pipeline again on request ("retry"), extracting even when the content looks unchanged.
     */
    public function restart(Stash $stash): void
    {
        $this->run($stash, ExtractContent::forced($stash->id, $stash->user_id));
    }

    private function run(Stash $stash, ExtractContent $extract): void
    {
        $stash->forceFill(['ai_status' => AiStatus::Skipped, 'ai_stage' => null, 'ai_error' => null])->save();

        $index = new IndexStash($stash->id, $stash->user_id);

        // Notes and colors are complete as they are. A failed stage ends the chain, the stash stays as saved.
        $first =
            $stash->type === StashType::Note || $stash->type === StashType::Color
                ? $index
                : $extract->chain([$index]);

        dispatch($first->afterCommit());
    }
}
