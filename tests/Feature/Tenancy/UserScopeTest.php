<?php

declare(strict_types=1);

use App\Models\Collection;
use App\Models\Stash;
use App\Models\Tag;
use App\Models\User;

beforeEach(function () {
    $this->alice = User::factory()->create();
    $this->bob = User::factory()->create();

    $this->aliceStash = Stash::factory()->for($this->alice)->create();
    $this->bobStash = Stash::factory()->for($this->bob)->create();

    Tag::factory()->for($this->alice)->create();
    $this->bobTag = Tag::factory()->for($this->bob)->create();

    Collection::factory()->for($this->alice)->create();
    $this->bobCollection = Collection::factory()->for($this->bob)->create();
});

test('a signed-in user only sees their own rows', function () {
    $this->actingAs($this->alice);

    expect(Stash::count())
        ->toBe(1)
        ->and(Stash::find($this->bobStash->id))
        ->toBeNull()
        ->and(Tag::count())
        ->toBe(1)
        ->and(Tag::find($this->bobTag->id))
        ->toBeNull()
        ->and(Collection::count())
        ->toBe(1)
        ->and(Collection::find($this->bobCollection->id))
        ->toBeNull();
});

test('relations through the user stay inside the scope', function () {
    $this->actingAs($this->alice);

    expect($this->bob->stashes()->count())->toBe(0);
});

test('a web request without a user sees nothing', function () {
    $app = app();
    $console = new ReflectionProperty($app, 'isRunningInConsole');
    $console->setValue($app, false);

    try {
        expect(Stash::count())->toBe(0);
    } finally {
        $console->setValue($app, true);
    }
});

test('console commands and queue workers are not scoped', function () {
    expect(Stash::count())->toBe(2);
});

test('creating a row fills the owner from the signed-in user', function () {
    $this->actingAs($this->alice);

    $stash = Stash::create(['type' => 'note', 'body' => 'hello']);

    expect($stash->user_id)->toBe($this->alice->id);
});

test('creating a row keeps an explicit owner', function () {
    $this->actingAs($this->alice);

    $stash = new Stash(['type' => 'note', 'body' => 'hello']);
    $stash->user_id = $this->bob->id;
    $stash->save();

    expect($stash->user_id)->toBe($this->bob->id);
});
