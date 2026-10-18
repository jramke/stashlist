<?php

declare(strict_types=1);

namespace App\Pipeline;

use App\Actions\Stashes\CapturedPage;
use App\Ai\AiGuard;
use App\Ai\Embedding\Embedders;
use App\Enums\AiStatus;
use App\Enums\FileRole;
use App\Enums\StashType;
use App\Jobs\DeriveCapturedImage;
use App\Jobs\ExtractContent;
use App\Jobs\FetchFavicon;
use App\Jobs\GenerateEmbedding;
use App\Jobs\GenerateEnrichment;
use App\Jobs\IndexStash;
use App\Models\Stash;

/**
 * Starts the background work for a new or changed stash: look at what it points to (links and images), ask the
 * model for a summary and tags, then the search index. The model is left out, and the stash is "skipped" as far
 * as AI goes, when the instance has AI off, the owner turned smart features off, or the stash is something the
 * model has nothing to say about (a color).
 *
 * A client that has the page open can send the page's text and picture (CapturedPage). The server never
 * overrides that: with the text it does not fetch the page, and a picture the client sent is the one used.
 */
final class StartPipeline
{
    public function __construct(
        private readonly AiGuard $guard,
        private readonly Embedders $embedders,
    ) {}

    public function start(Stash $stash, ?CapturedPage $captured = null): void
    {
        $this->run($stash, $this->lookAt($stash, $captured));
    }

    /**
     * Runs the pipeline again on request ("retry"), extracting even when the content looks unchanged.
     */
    public function restart(Stash $stash): void
    {
        $this->run(
            $stash,
            $this->isExtractable($stash)
                ? [ExtractContent::forced($stash->id, $stash->user_id), new FetchFavicon($stash->id, $stash->user_id)]
                : [],
        );
    }

    /**
     * The jobs that look at what the stash points to, in order.
     *
     * @return list<DeriveCapturedImage|ExtractContent|FetchFavicon>
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

        // After the page has been read: it says where its icons are.
        if ($stash->type === StashType::Link) {
            $jobs[] = new FetchFavicon($stash->id, $stash->user_id);
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
     * The model and the vectors, for the stashes they are for: everything but colors, of an owner who has smart
     * features on, on an instance that has them. The model looks at the pictures of images. The vectors are left
     * out where no embedder has a key.
     *
     * @return list<GenerateEnrichment|GenerateEmbedding>
     */
    private function smartJobs(Stash $stash): array
    {
        if ($stash->type === StashType::Color || ! $this->guard->allows($stash)) {
            return [];
        }

        $jobs = [new GenerateEnrichment($stash->id, $stash->user_id)];

        if (array_any($this->embedders->all(), $this->guard->canEmbed(...))) {
            $jobs[] = new GenerateEmbedding($stash->id, $stash->user_id);
        }

        return $jobs;
    }

    /**
     * Notes and colors are complete as they are.
     */
    private function isExtractable(Stash $stash): bool
    {
        return $stash->type !== StashType::Note && $stash->type !== StashType::Color;
    }

    /**
     * @param  list<DeriveCapturedImage|ExtractContent|FetchFavicon>  $lookAt
     */
    private function run(Stash $stash, array $lookAt): void
    {
        $enrich = $this->smartJobs($stash);

        $stash->forceFill([
            'ai_status' => $enrich === [] ? AiStatus::Skipped : AiStatus::Pending,
            'ai_stage' => null,
            'ai_error' => null,
        ])->save();

        // A failed stage ends the chain; the stash stays as saved.
        $jobs = [...$lookAt, ...$enrich, new IndexStash($stash->id, $stash->user_id)];
        $first = array_shift($jobs);

        dispatch($jobs === [] ? $first->afterCommit() : $first->chain($jobs)->afterCommit());
    }

    /**
     * Runs only the model and the index again, for a stash whose extraction is fine: the sweeper's and the
     * nightly retry's way back in.
     */
    public function enrichAgain(Stash $stash): void
    {
        $this->run($stash, []);
    }
}
