<?php

declare(strict_types=1);

namespace App\Pipeline;

use App\Actions\Stashes\CapturedPage;
use App\Enums\AiStatus;
use App\Enums\FileRole;
use App\Enums\StashType;
use App\Jobs\DeriveCapturedImage;
use App\Jobs\ExtractContent;
use App\Jobs\IndexStash;
use App\Models\Stash;

/**
 * Starts the background work for a new or changed stash: look at what it points to (links and images), then the
 * search index. The AI stages join the chain with the AI milestone, and until then every stash is "skipped" as
 * far as AI goes.
 *
 * A client that has the page open can send the page's text and picture (CapturedPage). The server never
 * overrides that: with the text it does not fetch the page, and a picture the client sent is the one used.
 */
final class StartPipeline
{
    public function start(Stash $stash, ?CapturedPage $captured = null): void
    {
        $this->run($stash, $this->lookAt($stash, $captured));
    }

    /**
     * Runs the pipeline again on request ("retry"), extracting even when the content looks unchanged.
     */
    public function restart(Stash $stash): void
    {
        $this->run($stash, $this->isExtractable($stash) ? [ExtractContent::forced($stash->id, $stash->user_id)] : []);
    }

    /**
     * The jobs that look at what the stash points to, in order.
     *
     * @return list<DeriveCapturedImage|ExtractContent>
     */
    private function lookAt(Stash $stash, ?CapturedPage $captured): array
    {
        if (! $this->isExtractable($stash)) {
            return [];
        }

        $jobs = [];

        if ($this->hasCapturedPicture($stash, $captured)) {
            $jobs[] = new DeriveCapturedImage($stash->id, $stash->user_id);
        }

        if ($captured === null || ! $captured->hasContent()) {
            $jobs[] = new ExtractContent($stash->id, $stash->user_id);
        }

        return $jobs;
    }

    private function hasCapturedPicture(Stash $stash, ?CapturedPage $captured): bool
    {
        return (
            $stash->type === StashType::Link &&
            $captured !== null &&
            (
                $captured->imageUrl !== null ||
                $stash->files()->whereIn('role', [FileRole::Og->value, FileRole::Screenshot->value])->exists()
            )
        );
    }

    /**
     * Notes and colors are complete as they are.
     */
    private function isExtractable(Stash $stash): bool
    {
        return $stash->type !== StashType::Note && $stash->type !== StashType::Color;
    }

    /**
     * @param  list<DeriveCapturedImage|ExtractContent>  $lookAt
     */
    private function run(Stash $stash, array $lookAt): void
    {
        $stash->forceFill(['ai_status' => AiStatus::Skipped, 'ai_stage' => null, 'ai_error' => null])->save();

        // A failed stage ends the chain; the stash stays as saved.
        $jobs = [...$lookAt, new IndexStash($stash->id, $stash->user_id)];
        $first = array_shift($jobs);

        dispatch($jobs === [] ? $first->afterCommit() : $first->chain($jobs)->afterCommit());
    }
}
