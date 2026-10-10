<?php

declare(strict_types=1);

use App\Actions\Stashes\CapturePayload;
use App\Actions\Stashes\CaptureStash;
use App\Collections\CollectionSync;
use App\Jobs\ExtractContent;
use App\Jobs\IndexStash;
use App\Models\Collection;
use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Models\Tag;
use App\Models\User;
use App\Tags\TagSync;
use Illuminate\Support\Facades\Queue;
use Tests\Support\FakeSearchEngine;

beforeEach(function () {
    $this->engine = FakeSearchEngine::install();
    $this->user = User::factory()->create();
});

test('saving a stash puts it in the index', function () {
    $stash = Stash::factory()->for($this->user)->create(['title' => 'Sourdough']);

    expect($this->engine->documents)
        ->toHaveKey($stash->id)
        ->and($this->engine->documents[$stash->id]['title'])
        ->toBe(
            'Sourdough',
        );
});

test('a captured stash is searchable at once, before the pipeline did anything', function () {
    // Extraction and the final index stage wait in the queue; the observer's index write is not held back by them.
    Queue::fake([ExtractContent::class, IndexStash::class]);

    $link = app(CaptureStash::class)->capture($this->user, new CapturePayload(
        input: 'https://bakeclub.example/starter',
        tags: ['Baking'],
    ))->stash;
    $note = app(CaptureStash::class)->capture($this->user, new CapturePayload(input: 'call the baker'))->stash;

    expect($this->engine->documents[$link->id])
        ->toMatchArray([
            'url' => 'https://bakeclub.example/starter',
            'domain' => 'bakeclub.example',
            'tags' => ['Baking'],
        ])
        ->and($this->engine->documents[$note->id]['body'])
        ->toBe('call the baker');
});

test('deleting a stash takes it out of the index', function () {
    $stash = Stash::factory()->for($this->user)->create();

    $stash->delete();

    expect($this->engine->documents)->not->toHaveKey($stash->id)->and($this->engine->deleted)->toContain($stash->id);
});

test('IndexStash writes the document with the enrichment and notes the time without touching updated_at', function () {
    $stash = Stash::factory()->for($this->user)->create(['title' => null]);
    StashEnrichment::query()->create([
        'stash_id' => $stash->id,
        'user_id' => $this->user->id,
        'title' => 'Sourdough starters',
        'extracted_text' => 'A living culture of wild yeast.',
    ]);
    $this->engine->documents = [];
    $updatedAt = $stash->fresh()->updated_at;

    $this->travel(5)->minutes();
    new IndexStash($stash->id, $this->user->id)->handle();

    $fresh = $stash->fresh();

    expect($this->engine->documents[$stash->id])
        ->toMatchArray(['title' => 'Sourdough starters', 'content' => 'A living culture of wild yeast.'])
        ->and($fresh->indexed_at)
        ->not
        ->toBeNull()
        ->and($fresh->updated_at->equalTo($updatedAt))
        ->toBeTrue();
});

test('IndexStash does nothing for a stash that is gone or that belongs to someone else', function () {
    $stash = Stash::factory()->for($this->user)->create();
    $stranger = User::factory()->create();
    $this->engine->documents = [];

    new IndexStash($stash->id, $stranger->id)->handle();
    new IndexStash($stash->id + 1000, $this->user->id)->handle();

    expect($this->engine->documents)->toBeEmpty()->and($stash->fresh()->indexed_at)->toBeNull();
});

test('tags reach the index when they are added, renamed, removed and deleted', function () {
    $tags = app(TagSync::class);
    $stash = Stash::factory()->for($this->user)->create();
    $other = Stash::factory()->for($this->user)->create();

    $tag = $tags->addByUser($stash, 'Baking');
    $tags->addByUser($other, 'Baking');

    expect($this->engine->documents[$stash->id]['tags'])->toBe(['Baking']);

    $tags->rename($tag, 'Bread');

    expect($this->engine->documents[$stash->id]['tags'])
        ->toBe(['Bread'])
        ->and($this->engine->documents[$other->id]['tags'])
        ->toBe(['Bread']);

    $tags->removeByUser($stash, $tag);

    expect($this->engine->documents[$stash->id]['tags'])->toBeEmpty();

    $tags->delete($tag->refresh());

    expect($this->engine->documents[$other->id]['tags'])->toBeEmpty();
});

test('collections reach the index when stashes join, leave and the collection goes', function () {
    $sync = app(CollectionSync::class);
    $stash = Stash::factory()->for($this->user)->create();
    $other = Stash::factory()->for($this->user)->create();
    $collection = Collection::factory()->for($this->user)->create();

    $sync->syncCollections($stash, [$collection->id]);

    expect($this->engine->documents[$stash->id]['collection_ids'])->toBe([$collection->id]);

    $sync->syncStashes($collection, [$other->id]);

    expect($this->engine->documents[$stash->id]['collection_ids'])
        ->toBeEmpty()
        ->and($this->engine->documents[$other->id]['collection_ids'])
        ->toBe([$collection->id]);

    $sync->delete($collection);

    expect($this->engine->documents[$other->id]['collection_ids'])->toBeEmpty();
    expect(Collection::query()->count())->toBe(0);
});

test('changing only the pipeline bookkeeping does not index again', function () {
    $stash = Stash::factory()->for($this->user)->create();
    $this->engine->documents = [];

    $stash->forceFill(['ai_status' => App\Enums\AiStatus::Failed])->save();

    expect($this->engine->documents)->toBeEmpty();
});

test('a tag of another user is never part of a document', function () {
    $stash = Stash::factory()->for($this->user)->create();
    $foreign = Tag::factory()->for(User::factory()->create())->create(['name' => 'Secret', 'slug' => 'secret']);

    $stash->load(Stash::SEARCH_RELATIONS);

    expect($stash->toSearchableArray()['tags'])->not->toContain($foreign->name);
});
