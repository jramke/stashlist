<?php

declare(strict_types=1);

use App\Models\Stash;
use App\Models\Tag;
use App\Models\User;
use App\Tags\TagSync;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->stash = Stash::factory()->for($this->user)->create();
});

test('a tag is added by name and created when new', function () {
    $this->actingAs($this->user)->from("/stashes/{$this->stash->id}")->post("/stashes/{$this->stash->id}/tags", [
        'name' => '  #Web Design ',
    ])->assertRedirect("/stashes/{$this->stash->id}");

    $tag = Tag::query()->firstOrFail();

    expect($tag->name)
        ->toBe('Web Design')
        ->and($tag->stashes_count)
        ->toBe(1)
        ->and($this->stash->tags()->count())
        ->toBe(1);
});

test('names that are empty after cleaning up are refused', function (string $name) {
    $this->actingAs($this->user)->from("/stashes/{$this->stash->id}")->post("/stashes/{$this->stash->id}/tags", [
        'name' => $name,
    ])->assertSessionHasErrors('name');

    expect(Tag::count())->toBe(0);
})->with(['', ' ', '#', ' # # ']);

test('a tag is removed from a stash', function () {
    $tag = app(TagSync::class)->addByUser($this->stash, 'design');

    $this
        ->actingAs($this->user)
        ->from("/stashes/{$this->stash->id}")
        ->delete("/stashes/{$this->stash->id}/tags/{$tag->id}")
        ->assertRedirect();

    expect($this->stash->tags()->count())->toBe(0)->and($tag->fresh()->stashes_count)->toBe(0);
});
