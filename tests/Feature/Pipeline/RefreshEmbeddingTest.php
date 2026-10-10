<?php

declare(strict_types=1);

use App\Enums\AiStatus;
use App\Jobs\GenerateEmbedding;
use App\Jobs\IndexStash;
use App\Models\Stash;
use App\Models\StashHighlight;
use App\Models\User;
use App\Tags\TagSync;
use Illuminate\Support\Facades\Queue;
use Tests\Support\FakeAi;

beforeEach(function () {
    FakeAi::install();
    Queue::fake();
});

function finished_stash(?User $user = null): Stash
{
    $stash = Stash::factory()->for($user ?? User::factory()->create())->create();
    Stash::query()->whereKey($stash->id)->update(['ai_status' => AiStatus::Done->value]);

    return $stash->refresh();
}

test('adding a tag makes the vector again a little later, then the index', function () {
    $stash = finished_stash();

    app(TagSync::class)->addByUser($stash, 'baking');

    Queue::assertPushedWithChain(GenerateEmbedding::class, [IndexStash::class]);
    Queue::assertPushed(
        GenerateEmbedding::class,
        fn (GenerateEmbedding $job): bool => $job->stashId === $stash->id && $job->delay === 45,
    );
});

test('five tags in a row cost one embedding', function () {
    $stash = finished_stash();

    foreach (['one', 'two', 'three', 'four', 'five'] as $name) {
        app(TagSync::class)->addByUser($stash, $name);
    }

    Queue::assertPushed(GenerateEmbedding::class, 1);
});

test('removing a tag, renaming it and deleting it change the text too', function () {
    $stash = finished_stash();
    $tags = app(TagSync::class);
    $tag = $tags->addByUser($stash, 'baking');
    Queue::assertPushed(GenerateEmbedding::class, 1);

    Illuminate\Support\Facades\Cache::flush();
    $tags->rename($tag, 'bread baking');
    Queue::assertPushed(GenerateEmbedding::class, 2);

    Illuminate\Support\Facades\Cache::flush();
    $tags->removeByUser($stash, $tag->refresh());
    Queue::assertPushed(GenerateEmbedding::class, 3);

    Illuminate\Support\Facades\Cache::flush();
    $tags->addByUser($stash, 'cheese');
    Illuminate\Support\Facades\Cache::flush();
    $tags->delete(App\Models\Tag::query()->where('slug', 'cheese')->sole());
    Queue::assertPushed(GenerateEmbedding::class, 5);
});

test('a highlight changes the text as well', function () {
    $stash = finished_stash();

    StashHighlight::factory()->onStash($stash)->create(['text' => 'wild yeast']);

    Queue::assertPushed(GenerateEmbedding::class, fn (GenerateEmbedding $job): bool => $job->stashId === $stash->id);
});

test('a stash still in the pipeline makes its own vector', function () {
    $stash = Stash::factory()->create();
    Stash::query()->whereKey($stash->id)->update(['ai_status' => AiStatus::Processing->value]);

    app(TagSync::class)->addByUser($stash->refresh(), 'baking');

    Queue::assertNotPushed(GenerateEmbedding::class);
});

test('a user with smart features off gets no refresh', function () {
    $stash = finished_stash(User::factory()->create(['ai_enabled' => false]));

    app(TagSync::class)->addByUser($stash, 'baking');

    Queue::assertNotPushed(GenerateEmbedding::class);
});

test('an instance without AI gets none either', function () {
    config(['stashlist.ai.enabled' => false]);
    $stash = finished_stash();

    app(TagSync::class)->addByUser($stash, 'baking');

    Queue::assertNotPushed(GenerateEmbedding::class);
});
