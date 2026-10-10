<?php

declare(strict_types=1);

use App\Models\Collection;
use App\Models\Stash;
use App\Models\User;
use App\Tags\TagSync;
use Illuminate\Support\Facades\Queue;

/**
 * User B tries every route that takes an id on user A's rows (plan 10.1). All of them must answer 404: the
 * ownership scope hides the rows before a controller runs.
 */
beforeEach(function () {
    Queue::fake();

    $this->alice = User::factory()->create();
    $this->bob = User::factory()->create();

    $this->stash = Stash::factory()->for($this->alice)->create();
    $this->tag = app(TagSync::class)->addByUser($this->stash, 'design');
    $this->bobStash = Stash::factory()->for($this->bob)->create();
    $this->collection = Collection::factory()->for($this->alice)->create();
});

test("bob cannot reach alice's stash", function (string $method, Closure $uri, array $data) {
    $this->actingAs($this->bob)->call($method, $uri($this), $data)->assertNotFound();

    // Nothing of alice's changed.
    expect(Stash::query()->withoutGlobalScopes()->find($this->stash->id))
        ->not
        ->toBeNull()
        ->and($this->stash->fresh()->title)
        ->toBe($this->stash->title);
})->with([
    'show' => ['GET', fn ($t) => "/stashes/{$t->stash->id}", []],
    'update' => ['PATCH', fn ($t) => "/stashes/{$t->stash->id}", ['title' => 'hijacked']],
    'destroy' => ['DELETE', fn ($t) => "/stashes/{$t->stash->id}", []],
    'undo deletion' => ['DELETE', fn ($t) => "/stashes/{$t->stash->id}/deletion", []],
    'reprocess' => ['POST', fn ($t) => "/stashes/{$t->stash->id}/reprocess", []],
    'add a tag' => ['POST', fn ($t) => "/stashes/{$t->stash->id}/tags", ['name' => 'mine now']],
    'remove a tag' => ['DELETE', fn ($t) => "/stashes/{$t->stash->id}/tags/{$t->tag->id}", []],
]);

test("bob cannot use alice's tag on his own stash", function () {
    $this->actingAs($this->bob)->delete("/stashes/{$this->bobStash->id}/tags/{$this->tag->id}")->assertNotFound();
});

test('bob sees only his own stashes in the feed', function () {
    $this
        ->actingAs($this->bob)
        ->get('/stashes')
        ->assertInertia(
            fn (Inertia\Testing\AssertableInertia $page) => $page->has('stashes.data', 1)->where(
                'stashes.data.0.id',
                $this->bobStash->id,
            ),
        );
});

test("bob cannot file his stash under alice's tag by name", function () {
    $this->actingAs($this->bob)->post("/stashes/{$this->bobStash->id}/tags", ['name' => 'design']);

    $bobsTag = $this->bobStash->tags()->firstOrFail();

    expect($bobsTag->id)
        ->not
        ->toBe($this->tag->id)
        ->and($bobsTag->user_id)
        ->toBe($this->bob->id)
        ->and($this->tag->fresh()->stashes_count)
        ->toBe(1);
});

test("bob cannot reach alice's collections and tags", function (string $method, Closure $uri, array $data) {
    $this->actingAs($this->bob)->call($method, $uri($this), $data)->assertNotFound();

    expect(Collection::query()->withoutGlobalScopes()->find($this->collection->id)?->name)
        ->toBe($this->collection->name);
})->with([
    'rename a collection' => ['PATCH', fn ($t) => "/collections/{$t->collection->id}", ['name' => 'hijacked']],
    'delete a collection' => ['DELETE', fn ($t) => "/collections/{$t->collection->id}", []],
    'set the stashes of a collection' => [
        'PUT',
        fn ($t) => "/collections/{$t->collection->id}/stashes",
        ['stash_ids' => []],
    ],
    'rename a tag' => ['PATCH', fn ($t) => "/tags/{$t->tag->id}", ['name' => 'hijacked']],
    'delete a tag' => ['DELETE', fn ($t) => "/tags/{$t->tag->id}", []],
    'set the collections of a stash' => [
        'PUT',
        fn ($t) => "/stashes/{$t->stash->id}/collections",
        ['collection_ids' => []],
    ],
]);
