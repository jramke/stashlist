<?php

declare(strict_types=1);

use App\Ai\Embedding\Embedders;
use App\Ai\Embedding\EmbeddingText;
use App\Ai\Embedding\VectorCodec;
use App\Jobs\ReembedStashes;
use App\Models\Stash;
use App\Models\StashEmbedding;
use App\Models\UsageMonthly;
use App\Models\User;
use Illuminate\Support\Facades\Queue;
use Laravel\Ai\Exceptions\RateLimitedException;
use Tests\Support\FakeAi;
use Tests\Support\FakeSearchEngine;
use Tests\Support\SpyEmbedder;

beforeEach(function () {
    FakeAi::install();
    $this->embedder = new SpyEmbedder;
    app()->instance(Embedders::class, new Embedders(['text_v1' => $this->embedder]));
    $this->user = User::factory()->create();
});

function embedded_row(Stash $stash, array $changes = []): void
{
    StashEmbedding::query()->create([
        'stash_id' => $stash->id,
        'embedder' => 'text_v1',
        'user_id' => $stash->user_id,
        'model' => 'fake-embedding',
        'dimensions' => 16,
        'recipe_version' => EmbeddingText::VERSION,
        'input_hash' => str_repeat('a', 64),
        'vector' => VectorCodec::pack(array_fill(0, 16, 0.25)),
        ...$changes,
    ]);
}

test('reindex rebuilds the documents of everyone, or of one user, from the database', function () {
    $engine = FakeSearchEngine::install();
    $mine = Stash::factory()->for($this->user)->create();
    $theirs = Stash::factory()->create();
    $engine->documents = [];

    $this->artisan('stashlist:reindex', ['--user' => $this->user->id])->assertSuccessful();
    expect(array_keys($engine->documents))->toBe([$mine->id]);

    $this->artisan('stashlist:reindex')->assertSuccessful();
    expect(array_keys($engine->documents))->toEqualCanonicalizing([$mine->id, $theirs->id]);
});

test('reembed queues the stashes whose vector is missing or stale, sixty-four at a time', function () {
    Queue::fake();
    $current = Stash::factory()->for($this->user)->note()->create();
    embedded_row($current);
    $otherModel = Stash::factory()->for($this->user)->note()->create();
    embedded_row($otherModel, ['model' => 'older-model']);
    $oldRecipe = Stash::factory()->for($this->user)->note()->create();
    embedded_row($oldRecipe, ['recipe_version' => 0]);
    $missing = Stash::factory()->count(70)->for($this->user)->note()->create();

    $this->artisan('stashlist:reembed')->assertSuccessful();

    $queued = Queue::pushed(ReembedStashes::class);
    $ids = $queued->flatMap(fn (ReembedStashes $job): array => $job->stashIds)->all();

    expect($queued)
        ->toHaveCount(2)
        ->and(
            $queued
                ->map(fn (ReembedStashes $job): int => count($job->stashIds))
                ->sortDesc()
                ->values()
                ->all(),
        )
        ->toBe([64, 8])
        ->and($ids)
        ->toContain($otherModel->id, $oldRecipe->id)
        ->not->toContain($current->id);
    Queue::assertPushedOn('ai-low', ReembedStashes::class);
});

test('reembed leaves out the stashes of users who turned smart features off', function () {
    Queue::fake();
    Stash::factory()
        ->for(User::factory()->create(['ai_enabled' => false]))
        ->note()
        ->create();

    $this->artisan('stashlist:reembed')->assertSuccessful();

    Queue::assertNotPushed(ReembedStashes::class);
});

test('reembed can count without queueing, narrow to a user and name an embedder', function () {
    Queue::fake();
    Stash::factory()->for($this->user)->note()->create();
    Stash::factory()->note()->create();

    $this
        ->artisan('stashlist:reembed', ['--dry-run' => true])
        ->expectsOutputToContain('2 stashes would be embedded')
        ->assertSuccessful();
    Queue::assertNotPushed(ReembedStashes::class);

    $this
        ->artisan('stashlist:reembed', ['--user' => $this->user->id])
        ->expectsOutputToContain('1 stashes queued')
        ->assertSuccessful();
    Queue::assertPushed(ReembedStashes::class, 1);

    $this->artisan('stashlist:reembed', ['--to' => 'text_v9'])->assertFailed();
});

test('a batch is embedded in one call, stored, counted for each owner and put into the index', function () {
    $engine = FakeSearchEngine::install();
    $other = User::factory()->create();
    $a = Stash::factory()->for($this->user)->note()->create(['body' => 'sourdough starter']);
    $b = Stash::factory()->for($other)->note()->create(['body' => 'knitting patterns']);
    $off = Stash::factory()
        ->for(User::factory()->create(['ai_enabled' => false]))
        ->note()
        ->create();
    $engine->documents = [];

    dispatch_sync(new ReembedStashes([$a->id, $b->id, $off->id], 'text_v1'));

    expect($this->embedder->calls)
        ->toHaveCount(1)
        ->and($this->embedder->calls[0])
        ->toHaveCount(2)
        ->and(StashEmbedding::query()->pluck('stash_id')->all())
        ->toEqualCanonicalizing([$a->id, $b->id])
        ->and(UsageMonthly::query()->where('user_id', $this->user->id)->sole()->embed_stashes)
        ->toBe(1)
        ->and(UsageMonthly::query()->where('user_id', $other->id)->sole()->embed_stashes)
        ->toBe(1)
        ->and(UsageMonthly::query()->count())
        ->toBe(2)
        ->and($engine->documents[$a->id]['_vectors']['text_v1'])
        ->toHaveCount(16);
});

test('a batch that is rate limited is put back', function () {
    $stash = Stash::factory()->for($this->user)->note()->create();
    $this->embedder->failure = new RateLimitedException('slow down');

    $job = new ReembedStashes([$stash->id], 'text_v1')->withFakeQueueInteractions();
    app()->call($job->handle(...));

    $job->assertReleased(60);
    expect(StashEmbedding::query()->count())->toBe(0);
});
