<?php

declare(strict_types=1);

use App\Models\Collection;
use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Models\User;
use App\Search\MakeSearchableUniquely;
use App\Tags\TagSync;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->user = User::factory()->create();
});

test('the search document holds the text, the tags and the collections of a stash', function () {
    $stash = Stash::factory()->for($this->user)->create([
        'title' => null,
        'url' => 'https://bakeclub.example/starter',
        'domain' => 'bakeclub.example',
        'subtype' => 'article',
        'body' => 'my own comment',
        'is_private' => true,
    ]);
    StashEnrichment::query()->create([
        'stash_id' => $stash->id,
        'user_id' => $this->user->id,
        'title' => 'Sourdough starters',
        'extracted_text' => 'A living culture of wild yeast.',
    ]);
    $tag = app(TagSync::class)->addByUser($stash, 'Baking');
    $collection = Collection::factory()->for($this->user)->create();
    $stash->collections()->attach($collection->id, ['user_id' => $this->user->id, 'created_at' => now()]);

    $stash->load(Stash::SEARCH_RELATIONS);
    $document = $stash->toSearchableArray();

    expect($document)
        ->toMatchArray([
            'id' => $stash->id,
            'user_id' => $this->user->id,
            'type' => 'link',
            'subtype' => 'article',
            'is_private' => true,
            'title' => 'Sourdough starters',
            'url' => 'https://bakeclub.example/starter',
            'domain' => 'bakeclub.example',
            'body' => 'my own comment',
            'content' => 'A living culture of wild yeast.',
            'tags' => ['Baking'],
            'tag_ids' => [$tag->id],
            'collection_ids' => [$collection->id],
        ])
        ->not
        ->toHaveKey('_vectors')
        ->and($document['created_at'])
        ->toBeInt();
});

test('a note without a title has no title in the index, only its text', function () {
    $note = Stash::factory()->for($this->user)->note()->create(['title' => null, 'body' => 'buy flour']);

    expect($note->load(Stash::SEARCH_RELATIONS)->toSearchableArray())->toMatchArray([
        'title' => null,
        'body' => 'buy flour',
    ]);
});

test('dismissed tags are not searchable', function () {
    $stash = Stash::factory()->for($this->user)->create();
    $tag = app(TagSync::class)->addByUser($stash, 'design');
    $stash->tags()->updateExistingPivot($tag->id, ['source' => 'ai', 'dismissed_at' => now()]);

    expect($stash->load(Stash::SEARCH_RELATIONS)->toSearchableArray())->toMatchArray(['tags' => [], 'tag_ids' => []]);
});

test('indexing a hundred stashes loads their relations in a fixed number of queries', function () {
    Stash::factory()->count(100)->for($this->user)->create();
    $stashes = Stash::query()->get();

    DB::flushQueryLog();
    DB::enableQueryLog();

    $stashes->first()?->makeSearchableUsing($stashes);
    foreach ($stashes as $stash) {
        $stash->toSearchableArray();
    }

    // enrichments, visible tags (with pivot), collections: one query each, not one per stash.
    expect(count(DB::getQueryLog()))->toBeLessThanOrEqual(3);
});

test('only changes to searchable columns reindex a stash', function () {
    $stash = Stash::factory()->for($this->user)->create();
    $stash->refresh();

    $stash->ai_status = App\Enums\AiStatus::Done;
    $stash->save();
    expect($stash->searchIndexShouldBeUpdated())->toBeFalse();

    $stash->title = 'New title';
    $stash->save();
    expect($stash->searchIndexShouldBeUpdated())->toBeTrue();
});

test('rapid saves of one stash collapse into one queued indexing job', function () {
    $stash = Stash::factory()->for($this->user)->create();
    $models = new Illuminate\Database\Eloquent\Collection([$stash]);

    $first = new MakeSearchableUniquely($models);
    $second = new MakeSearchableUniquely($models);

    expect($first->uniqueId())
        ->toBe($second->uniqueId())
        ->and($first->uniqueId())
        ->toStartWith('scout:'.Stash::class);
});
