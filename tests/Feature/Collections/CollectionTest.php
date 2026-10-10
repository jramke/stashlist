<?php

declare(strict_types=1);

use App\Models\Collection;
use App\Models\Stash;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->other = User::factory()->create();
});

test('the collections page needs a login and renders for users', function () {
    $this->get('/collections')->assertRedirect('/login');

    $this
        ->actingAs($this->user)
        ->get('/collections')
        ->assertInertia(fn (AssertableInertia $page) => $page->component('collections/index'));
});

test('a collection is created at the end of the list', function () {
    Collection::factory()->for($this->user)->create(['position' => 4]);

    $this
        ->actingAs($this->user)
        ->from('/collections')
        ->post('/collections', ['name' => 'Recipes', 'description' => 'Things to cook'])
        ->assertRedirect('/collections');

    $collection = Collection::query()->where('name', 'Recipes')->firstOrFail();

    expect($collection->user_id)
        ->toBe($this->user->id)
        ->and($collection->description)
        ->toBe('Things to cook')
        ->and($collection->position)
        ->toBe(5);
});

test('a collection needs a name', function () {
    $this
        ->actingAs($this->user)
        ->from('/collections')
        ->post('/collections', ['name' => ''])
        ->assertSessionHasErrors('name');

    expect(Collection::count())->toBe(0);
});

test('a collection can be renamed and described', function () {
    $collection = Collection::factory()->for($this->user)->create(['name' => 'Old', 'position' => 3]);

    $this->actingAs($this->user)->from('/collections')->patch("/collections/{$collection->id}", [
        'name' => 'New',
        'description' => 'About it',
    ])->assertRedirect('/collections');

    $fresh = $collection->fresh();

    expect($fresh->name)->toBe('New')->and($fresh->description)->toBe('About it')->and($fresh->position)->toBe(3);
});

test('deleting a collection keeps its stashes', function () {
    $collection = Collection::factory()->for($this->user)->create();
    $stash = Stash::factory()->for($this->user)->create();
    $stash->collections()->attach($collection->id, ['user_id' => $this->user->id, 'created_at' => now()]);

    $this->actingAs($this->user)->delete("/collections/{$collection->id}")->assertRedirect('/collections');

    expect(Collection::count())
        ->toBe(0)
        ->and(Stash::query()->find($stash->id))
        ->not
        ->toBeNull()
        ->and($stash->collections()->count())
        ->toBe(0);
});

test('the sidebar order can be saved', function () {
    $a = Collection::factory()->for($this->user)->create(['position' => 0]);
    $b = Collection::factory()->for($this->user)->create(['position' => 1]);
    $c = Collection::factory()->for($this->user)->create(['position' => 2]);
    $foreign = Collection::factory()->for($this->other)->create(['position' => 7]);

    $this
        ->actingAs($this->user)
        ->from('/collections')
        ->put('/collections/order', ['ids' => [$c->id, $a->id, $b->id, $foreign->id]])
        ->assertRedirect('/collections');

    expect($c->fresh()->position)
        ->toBe(0)
        ->and($a->fresh()->position)
        ->toBe(1)
        ->and($b->fresh()->position)
        ->toBe(2)
        ->and($foreign->fresh()->position)
        ->toBe(7);
});

test('the stashes of a collection are set and ordered together', function () {
    $collection = Collection::factory()->for($this->user)->create();
    [$one, $two, $three] = Stash::factory()->count(3)->for($this->user)->create()->all();
    $foreign = Stash::factory()->for($this->other)->create();
    $one->collections()->attach($collection->id, [
        'user_id' => $this->user->id,
        'position' => 0,
        'created_at' => now()->subDay(),
    ]);
    $three->collections()->attach($collection->id, [
        'user_id' => $this->user->id,
        'position' => 1,
        'created_at' => now()->subDay(),
    ]);

    $this
        ->actingAs($this->user)
        ->from('/collections')
        ->put("/collections/{$collection->id}/stashes", ['stash_ids' => [$two->id, $foreign->id, $one->id]])
        ->assertRedirect('/collections');

    $members = $collection->stashes()->orderByPivot('position')->get();

    expect($members->pluck('id')->all())
        ->toBe([$two->id, $one->id])
        ->and($members->pluck('pivot.position')->all())
        ->toBe([0, 1])
        ->and($three->collections()->count())
        ->toBe(0);

    // A stash that stayed keeps the time it was added.
    expect($members->firstWhere('id', $one->id)?->pivot->created_at)
        ->toBeLessThan(now()->subHours(12)->toDateTimeString());
});

test('a stash picks its collections', function () {
    $stash = Stash::factory()->for($this->user)->create();
    $mine = Collection::factory()->for($this->user)->create();
    $alsoMine = Collection::factory()->for($this->user)->create();
    $foreign = Collection::factory()->for($this->other)->create();
    $stash->collections()->attach($alsoMine->id, ['user_id' => $this->user->id, 'created_at' => now()]);

    $this
        ->actingAs($this->user)
        ->from("/stashes/{$stash->id}")
        ->put("/stashes/{$stash->id}/collections", ['collection_ids' => [$mine->id, $foreign->id]])
        ->assertRedirect();

    expect($stash->collections()->pluck('collections.id')->all())->toBe([$mine->id]);
});

test('the shared collections carry their stash counts', function () {
    $collection = Collection::factory()->for($this->user)->create(['name' => 'Recipes']);
    foreach (Stash::factory()->count(2)->for($this->user)->create() as $stash) {
        $stash->collections()->attach($collection->id, ['user_id' => $this->user->id, 'created_at' => now()]);
    }

    $this
        ->actingAs($this->user)
        ->get('/collections')
        ->assertInertia(
            fn (AssertableInertia $page) => $page->where('collections.0.name', 'Recipes')->where(
                'collections.0.stashes_count',
                2,
            ),
        );
});
