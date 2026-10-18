<?php

declare(strict_types=1);

use App\Actions\Stashes\CapturedPage;
use App\Enums\AiStatus;
use App\Enums\StashType;
use App\Jobs\ExtractContent;
use App\Jobs\FetchFavicon;
use App\Jobs\GenerateEmbedding;
use App\Jobs\GenerateEnrichment;
use App\Jobs\IndexStash;
use App\Models\Stash;
use App\Models\User;
use App\Pipeline\StartPipeline;
use Illuminate\Support\Facades\Queue;
use Tests\Support\FakeAi;

beforeEach(function () {
    Queue::fake();
    FakeAi::install();
});

test('a link is read, its icon fetched, then the model, then the index', function () {
    $stash = Stash::factory()->create();

    app(StartPipeline::class)->start($stash);

    Queue::assertPushedWithChain(ExtractContent::class, [
        FetchFavicon::class,
        GenerateEnrichment::class,
        GenerateEmbedding::class,
        IndexStash::class,
    ]);

    expect($stash->fresh()->ai_status)->toBe(AiStatus::Pending);
});

test('a note goes to the model without being read first', function () {
    $stash = Stash::factory()->note()->create();

    app(StartPipeline::class)->start($stash);

    Queue::assertNotPushed(ExtractContent::class);
    Queue::assertNotPushed(FetchFavicon::class);
    Queue::assertPushedWithChain(GenerateEnrichment::class, [GenerateEmbedding::class, IndexStash::class]);

    expect($stash->fresh()->ai_status)->toBe(AiStatus::Pending);
});

test('a page the client already read is not read again, only its icon is fetched before the model', function () {
    $stash = Stash::factory()->create();

    app(StartPipeline::class)->start($stash, new CapturedPage(contentMarkdown: '# A page'));

    Queue::assertNotPushed(ExtractContent::class);
    Queue::assertPushedWithChain(FetchFavicon::class, [
        GenerateEnrichment::class,
        GenerateEmbedding::class,
        IndexStash::class,
    ]);
});

test('the model jobs wait on the ai queue and carry ids only', function () {
    $stash = Stash::factory()->note()->create();

    app(StartPipeline::class)->start($stash);

    Queue::assertPushedOn(
        'ai',
        GenerateEnrichment::class,
        fn (GenerateEnrichment $job): bool => $job->stashId === $stash->id && $job->userId === $stash->user_id,
    );
});

test('an image is read first, then the model looks at the picture, and it has no site to take an icon from', function () {
    $stash = Stash::factory()->create(['type' => StashType::Image]);

    app(StartPipeline::class)->start($stash);

    Queue::assertNotPushed(FetchFavicon::class);
    Queue::assertPushedWithChain(ExtractContent::class, [
        GenerateEnrichment::class,
        GenerateEmbedding::class,
        IndexStash::class,
    ]);

    expect($stash->fresh()->ai_status)->toBe(AiStatus::Pending);
});

test('a color has nothing for the model to say', function () {
    $stash = Stash::factory()->create([
        'type' => StashType::Color,
        'url' => null,
        'url_hash' => null,
        'domain' => null,
        'body' => '#e63946',
    ]);

    app(StartPipeline::class)->start($stash);

    Queue::assertNotPushed(GenerateEnrichment::class);

    expect($stash->fresh()->ai_status)->toBe(AiStatus::Skipped);
});

test('with smart features off the chain has no model and the stash is skipped', function () {
    $stash = Stash::factory()
        ->for(User::factory()->create(['ai_enabled' => false]))
        ->note()
        ->create();

    app(StartPipeline::class)->start($stash);

    Queue::assertNotPushed(GenerateEnrichment::class);
    Queue::assertPushed(IndexStash::class);

    expect($stash->fresh()->ai_status)->toBe(AiStatus::Skipped);
});

test('with AI off on the instance the chain has no model either', function () {
    config(['stashlist.ai.enabled' => false]);
    $stash = Stash::factory()->note()->create();

    app(StartPipeline::class)->start($stash);

    Queue::assertNotPushed(GenerateEnrichment::class);

    expect($stash->fresh()->ai_status)->toBe(AiStatus::Skipped);
});

test('the retry button runs everything again, the model included', function () {
    $stash = Stash::factory()->create();

    app(StartPipeline::class)->restart($stash);

    Queue::assertPushedWithChain(ExtractContent::class, [
        FetchFavicon::class,
        GenerateEnrichment::class,
        GenerateEmbedding::class,
        IndexStash::class,
    ]);
});

test('running only the model again leaves out extraction', function () {
    $stash = Stash::factory()->create();

    app(StartPipeline::class)->enrichAgain($stash);

    Queue::assertNotPushed(ExtractContent::class);
    Queue::assertPushedWithChain(GenerateEnrichment::class, [GenerateEmbedding::class, IndexStash::class]);
});

test('switching smart features back on queues nothing by itself', function () {
    $user = User::factory()->create(['ai_enabled' => false]);
    Stash::factory()->for($user)->note()->create();

    $user->forceFill(['ai_enabled' => true])->save();

    Queue::assertNotPushed(GenerateEnrichment::class);
});
