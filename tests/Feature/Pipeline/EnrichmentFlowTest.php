<?php

declare(strict_types=1);

use App\Ai\Agents\StashEnricher;
use App\Enums\AiStatus;
use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Models\User;
use App\Tags\TagSync;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakeAi;
use Tests\Support\FakeWeb;
use Tests\Support\Images;

const FLOW_URL = 'https://bakeclub.example/posts/starter';

beforeEach(function () {
    Storage::fake();
    $this->user = User::factory()->create();
});

/**
 * Saves the article from the browser, the way the person would; the queue runs inline.
 */
function save_article(): Stash
{
    FakeWeb::install(['bakeclub.example' => ['93.184.216.34']], [
        FakeWeb::html('article'),
        FakeWeb::image(Images::make('png', width: 800, height: 600)),
    ]);

    test()->actingAs(test()->user)->post('/stashes', ['input' => FLOW_URL])->assertRedirect();

    return Stash::query()->firstOrFail();
}

test('a saved link comes out with sensible tags, a summary and a done status', function () {
    FakeAi::install([FakeAi::answer()]);

    $stash = save_article();
    $enrichment = StashEnrichment::findOrFail($stash->id);

    StashEnricher::assertPromptedTimes(1);
    // The model was shown the text the page was read for, not the address alone.
    StashEnricher::assertPrompted(fn ($prompt): bool => str_contains($prompt->prompt, 'living culture of wild yeast'));

    expect($stash->ai_status)
        ->toBe(AiStatus::Done)
        ->and($stash->visibleTags->count())
        ->toBeGreaterThanOrEqual(5)
        ->toBeLessThanOrEqual(8)
        ->and($enrichment->summary)
        ->not
        ->toBeNull()
        ->and($stash->subtype)
        ->toBe('article');
});

test('running the pipeline again keeps the tags the person added and the ones they removed', function () {
    FakeAi::install([
        FakeAi::answer(),
        FakeAi::answer(['tags' => ['sourdough', 'baking', 'bread', 'starter', 'yeast']]),
    ]);
    $stash = save_article();
    $tags = app(TagSync::class);
    $tags->addByUser($stash, 'for the weekend');
    $tags->removeByUser($stash, $stash->visibleTags->firstWhere('name', 'fermentation'));
    // The page changed since last time, so the model is asked again.
    StashEnrichment::query()->whereKey($stash->id)->update(['enrich_hash' => null]);
    FakeWeb::install(['bakeclub.example' => ['93.184.216.34']], [
        FakeWeb::html('article'),
        FakeWeb::image(Images::make('png', width: 800, height: 600)),
    ]);

    $this->actingAs($this->user)->post("/stashes/{$stash->id}/reprocess")->assertRedirect();

    $names = $stash->fresh()->visibleTags->pluck('name')->all();

    expect($names)->toContain('for the weekend', 'starter', 'yeast')->not->toContain('fermentation', 'recipes');
});

test('with smart features off a saved link is read and indexed but never sent anywhere', function () {
    FakeAi::install();
    $this->user->forceFill(['ai_enabled' => false])->save();

    $stash = save_article();

    StashEnricher::assertNeverPrompted();

    expect($stash->ai_status)
        ->toBe(AiStatus::Skipped)
        ->and(StashEnrichment::findOrFail($stash->id)->extracted_text)
        ->toContain('living culture of wild yeast')
        ->and($stash->visibleTags)
        ->toHaveCount(0);
});

test('when the model fails the page is still read and the stash says what went wrong', function () {
    FakeAi::install([[]]);

    $stash = save_article();

    expect($stash->ai_status)
        ->toBe(AiStatus::Failed)
        ->and($stash->ai_error)
        ->toBe('llm_refused')
        ->and(StashEnrichment::findOrFail($stash->id)->extracted_text)
        ->toContain('living culture of wild yeast')
        // The failed stage still queued the index write, which stamps the time.
        ->and($stash->indexed_at)
        ->not->toBeNull();
});
