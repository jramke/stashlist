<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Ai\AiGuard;
use App\Ai\AiNotAllowed;
use App\Ai\Enricher;
use App\Ai\Enrichment;
use App\Ai\EnrichmentInput;
use App\Ai\Llm;
use App\Enums\AiStage;
use App\Enums\AiStatus;
use App\Enums\StashType;
use App\Enums\Subtype;
use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Pipeline\Attempt;
use App\Pipeline\PipelineJob;
use App\Pipeline\UsageRecorder;
use App\Support\Limits;
use App\Tags\AiTagSync;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Pipeline stage 2: ask the model for a summary and tags and store them. Skipped without a call when the
 * material is the same as last time (`enrich_hash`), when the account has smart features off, and while the
 * plan's monthly cap is used up.
 *
 * It leaves `ai_status` at "processing"; the index stage after it makes it "done".
 */
final class GenerateEnrichment extends PipelineJob
{
    protected function stage(): AiStage
    {
        return AiStage::Enrich;
    }

    protected function limiter(): string
    {
        return 'llm';
    }

    public function handle(
        AiGuard $guard,
        Enricher $enricher,
        Limits $limits,
        AiTagSync $tags,
        UsageRecorder $recorder,
    ): void {
        $stash = $this->stash();

        // Deleted meanwhile: nothing left to do.
        if ($stash === null) {
            return;
        }

        // A color has nothing for the model to say.
        if (! in_array($stash->type, [StashType::Link, StashType::Note, StashType::Image], strict: true)) {
            $this->mark($stash, AiStatus::Skipped);

            return;
        }

        // The switch may have been turned off after this job was queued. That is not an error: no call is made.
        if (! $guard->allows($stash)) {
            $this->mark($stash, AiStatus::Skipped);

            return;
        }

        $stash->load('enrichment');
        $llm = Llm::configured();
        $hash = EnrichmentInput::of($stash)->hash($llm);
        $attempt = Attempt::begin($this->attempts());

        if ($stash->enrichment?->enrich_hash === $hash && $stash->enrichment->enriched_at !== null) {
            $this->mark($stash, AiStatus::Processing, AiStage::Enrich);
            $recorder->skipped($stash, AiStage::Enrich, $attempt, $hash);

            return;
        }

        if (! $limits->mayEnrich($this->userId)) {
            $this->mark($stash, AiStatus::Pending, AiStage::Enrich, 'quota');

            return;
        }

        $this->mark($stash, AiStatus::Processing, AiStage::Enrich);

        try {
            $enrichment = $enricher->enrich($stash, $llm);
        } catch (AiNotAllowed) {
            $this->mark($stash, AiStatus::Skipped);

            return;
        } catch (Throwable $failure) {
            $this->handleFailure($stash, $failure);

            return;
        }

        $this->apply($stash, $enrichment, $hash, $tags);
        $recorder->succeeded($stash, AiStage::Enrich, $attempt, $enrichment->call);
    }

    private function apply(Stash $stash, Enrichment $enrichment, string $hash, AiTagSync $tags): void
    {
        $result = $enrichment->result;

        DB::transaction(static function () use ($stash, $enrichment, $hash, $tags, $result): void {
            $row = StashEnrichment::query()->firstOrNew(['stash_id' => $stash->id]);

            $row->forceFill([
                'user_id' => $stash->user_id,
                // A title the page has wins; the model's only fills a gap.
                'title' => $row->title ?? ($result->title === '' ? null : $result->title),
                'summary' => $result->summary,
                'objects' => $result->objects === [] ? null : $result->objects,
                'ocr_text' => $result->ocrText === '' ? null : $result->ocrText,
                'language' => $result->language,
                'llm_provider' => $enrichment->call->provider,
                'llm_model' => $enrichment->call->model,
                'prompt_version' => config()->integer('stashlist.ai.prompt_version'),
                'enrich_hash' => $hash,
                'enriched_at' => now(),
            ])->save();

            $tags->apply($stash, $result->tags);

            // A subtype extraction found by rule stays; the model only fills a gap, and "other" says nothing.
            if ($stash->subtype === null && $result->subtype !== null && $result->subtype !== Subtype::Other) {
                Stash::withoutSyncingToSearch(
                    static fn () => $stash->forceFill([
                        'subtype' => $result->subtype?->value,
                    ])->save(),
                );
            }
        });
    }
}
