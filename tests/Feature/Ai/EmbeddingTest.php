<?php

declare(strict_types=1);

use App\Ai\Embedding\Embedders;
use App\Ai\Embedding\EmbeddingText;
use App\Ai\Embedding\FakeEmbedder;
use App\Ai\Embedding\LaravelAiEmbedder;
use App\Ai\Embedding\VectorCodec;
use App\Enums\AiStage;
use App\Enums\AiStatus;
use App\Enums\RunStatus;
use App\Jobs\GenerateEmbedding;
use App\Models\Stash;
use App\Models\StashEmbedding;
use App\Models\StashEnrichment;
use App\Models\StashHighlight;
use App\Models\StashRun;
use App\Models\UsageMonthly;
use App\Models\User;
use App\Tags\TagSync;
use Laravel\Ai\Embeddings;
use Laravel\Ai\Exceptions\RateLimitedException;
use Tests\Support\FakeAi;
use Tests\Support\SpyEmbedder;

beforeEach(function () {
    FakeAi::install();
    $this->embedder = new SpyEmbedder;
    app()->instance(Embedders::class, new Embedders(['text_v1' => $this->embedder]));
});

function embeddable_stash(?User $user = null): Stash
{
    $stash = Stash::factory()
        ->for($user ?? User::factory()->create())
        ->create(['title' => 'Sourdough starters', 'domain' => 'bakeclub.example']);
    StashEnrichment::query()->create([
        'stash_id' => $stash->id,
        'user_id' => $stash->user_id,
        'summary' => 'A guide to raising a sourdough starter.',
        'extracted_text' => 'A living culture of wild yeast and bacteria.',
    ]);

    return $stash;
}

function embed_stash(Stash $stash): void
{
    dispatch_sync(new GenerateEmbedding($stash->id, $stash->user_id));
}

test('a vector survives the trip to the database', function () {
    $vector = [0.25, -0.5, 1.0, 0.0, 0.123456];

    $back = VectorCodec::unpack(VectorCodec::pack($vector));

    expect(strlen(VectorCodec::pack($vector)))
        ->toBe(20)
        ->and($back[0])
        ->toBe(0.25)
        ->and($back[4])
        ->toEqualWithDelta(0.123456, 1e-6);
    expect(fn () => VectorCodec::unpack('abc'))->toThrow(InvalidArgumentException::class);
});

test('the text a stash is embedded as has its title, summary, tags, highlights, address and content', function () {
    $stash = embeddable_stash();
    app(TagSync::class)->addByUser($stash, 'baking');
    app(TagSync::class)->addByUser($stash, 'bread');
    StashHighlight::factory()->onStash($stash)->create(['text' => 'wild yeast and bacteria']);
    $stash->load(['enrichment', 'visibleTags', 'highlights']);

    expect(EmbeddingText::of($stash))
        ->toBe(
            "Sourdough starters\nA guide to raising a sourdough starter.\nTags: baking, bread\nwild yeast and bacteria\nbakeclub.example\nA living culture of wild yeast and bacteria.",
        );
});

test('the user\'s own words come before the page text, and the whole is capped', function () {
    $stash = embeddable_stash();
    $stash->forceFill(['body' => str_repeat('my own words ', 400)])->save();
    $stash->load(['enrichment', 'visibleTags', 'highlights']);

    $text = EmbeddingText::of($stash);

    expect($text)
        ->toContain('my own words')
        ->not
        ->toContain('wild yeast')
        ->and(mb_strlen($text))
        ->toBeLessThanOrEqual(2000);
});

test('the fake embedder puts texts that share words close together', function () {
    $embedder = new FakeEmbedder(dimensions: 64);
    [$a, $b, $c] = $embedder->embed([
        'sourdough starter bread',
        'bread starter recipe',
        'quantum chromodynamics lattice',
    ])->vectors;
    $dot = static fn (array $x, array $y): float => array_sum(array_map(static fn ($p, $q) => $p * $q, $x, $y));

    expect($dot($a, $b))
        ->toBeGreaterThan(0.4)
        ->and($dot($a, $c))
        ->toBeLessThan(0.3)
        ->and($dot($a, $a))
        ->toEqualWithDelta(1.0, 1e-9);
});

test('the SDK embedder asks for its model at its size and reports the tokens', function () {
    Embeddings::fake([[Embeddings::fakeEmbedding(512)]]);

    $embedded = new LaravelAiEmbedder('text_v1', 'openai', 'text-embedding-3-large', 512)->embed(['a text']);

    Embeddings::assertGenerated(
        fn ($prompt): bool => $prompt->dimensions === 512 && $prompt->model === 'text-embedding-3-large',
    );

    expect($embedded->vectors)->toHaveCount(1)->and($embedded->vectors[0])->toHaveCount(512);
});

test('a stash gets a vector with the model, size, recipe and hash that made it', function () {
    $stash = embeddable_stash();

    embed_stash($stash);

    $row = StashEmbedding::query()->where('stash_id', $stash->id)->sole();

    expect($row->embedder)
        ->toBe('text_v1')
        ->and($row->model)
        ->toBe('fake-embedding')
        ->and($row->dimensions)
        ->toBe(16)
        ->and($row->recipe_version)
        ->toBe(EmbeddingText::VERSION)
        ->and($row->input_hash)
        ->toHaveLength(64)
        ->and(VectorCodec::unpack($row->vector))
        ->toHaveCount(16)
        ->and($this->embedder->calls)
        ->toHaveCount(1);
});

test('the same text is not embedded twice, a changed one is', function () {
    $stash = embeddable_stash();

    embed_stash($stash);
    embed_stash($stash);

    expect($this->embedder->calls)
        ->toHaveCount(1)
        ->and(StashRun::query()->where('stash_id', $stash->id)->orderBy('id')->pluck('status')->all())
        ->toBe([RunStatus::Succeeded, RunStatus::Skipped]);

    app(TagSync::class)->addByUser($stash, 'baking');
    embed_stash($stash);

    expect($this->embedder->calls)
        ->toHaveCount(2)
        ->and($this->embedder->calls[1][0])
        ->toContain('Tags: baking')
        ->and(StashEmbedding::query()->where('stash_id', $stash->id)->count())
        ->toBe(1);
});

test('the run is logged with its tokens and added to the month', function () {
    $stash = embeddable_stash();

    embed_stash($stash);

    $run = StashRun::query()->where('stash_id', $stash->id)->sole();

    expect($run->stage)
        ->toBe(AiStage::Embed)
        ->and($run->tokens_in)
        ->toBeGreaterThan(0)
        ->and(UsageMonthly::query()->where('user_id', $stash->user_id)->sole()->embed_stashes)
        ->toBe(1)
        ->and(UsageMonthly::query()->where('user_id', $stash->user_id)->sole()->llm_stashes)
        ->toBe(0);
});

test('nothing is embedded for a user who turned smart features off', function () {
    $stash = embeddable_stash(User::factory()->create(['ai_enabled' => false]));

    embed_stash($stash);

    expect($this->embedder->calls)->toBeEmpty()->and(StashEmbedding::query()->count())->toBe(0);
});

test('nothing is embedded where the embedder has no key', function () {
    config(['stashlist.ai.enabled' => true]);
    $stash = embeddable_stash();
    app()->instance(Embedders::class, new Embedders(['text_v1' => new LaravelAiEmbedder(
        'text_v1',
        'cohere',
        'embed',
        16,
    )]));
    config(['ai.providers.cohere.key' => null]);

    embed_stash($stash);

    expect(StashEmbedding::query()->count())->toBe(0);
});

test('a vector of the wrong size is never stored', function () {
    $stash = embeddable_stash();
    $this->embedder->answerWithDimensions = 8;

    embed_stash($stash);

    expect(StashEmbedding::query()->count())
        ->toBe(0)
        ->and(StashRun::query()->where('stash_id', $stash->id)->sole()->status)
        ->toBe(RunStatus::Failed);
});

test('a refresh that fails does not turn a finished stash into a failed one', function () {
    $stash = embeddable_stash();
    Stash::query()->whereKey($stash->id)->update(['ai_status' => AiStatus::Done->value]);
    $this->embedder->answerWithDimensions = 8;

    embed_stash($stash);

    expect($stash->fresh()->ai_status)->toBe(AiStatus::Done);
});

test('inside the chain a failed embedding is reported on the stash', function () {
    $stash = embeddable_stash();
    Stash::query()->whereKey($stash->id)->update(['ai_status' => AiStatus::Processing->value]);
    $this->embedder->answerWithDimensions = 8;

    embed_stash($stash);

    $stash->refresh();

    expect($stash->ai_status)->toBe(AiStatus::Failed)->and($stash->ai_stage)->toBe(AiStage::Embed);
});

test('a rate limit puts the embedding back', function () {
    $stash = embeddable_stash();
    $this->embedder->failure = new RateLimitedException('slow down');

    $job = new GenerateEmbedding($stash->id, $stash->user_id)->withFakeQueueInteractions();
    app()->call($job->handle(...));

    $job->assertReleased(60);
});

test('the search document carries the vector, and only a vector that fits its embedder', function () {
    $stash = embeddable_stash();
    embed_stash($stash);

    $document = $stash->fresh()->load(Stash::SEARCH_RELATIONS)->toSearchableArray();

    expect($document['_vectors']['text_v1'])->toHaveCount(16);

    // A model or size left over from an older config is not sent: the index would reject the document.
    StashEmbedding::query()->where('stash_id', $stash->id)->update(['dimensions' => 8]);

    expect($stash->fresh()->load(Stash::SEARCH_RELATIONS)->toSearchableArray()['_vectors'])->toBe(['text_v1' => null]);
});

test('another user\'s vector is never in my document', function () {
    $mine = embeddable_stash();
    $theirs = embeddable_stash();
    embed_stash($theirs);

    expect($mine->load(Stash::SEARCH_RELATIONS)->toSearchableArray()['_vectors'])->toBe(['text_v1' => null]);
});
