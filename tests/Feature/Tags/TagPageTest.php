<?php

declare(strict_types=1);

use App\Models\Stash;
use App\Models\Tag;
use App\Models\User;
use App\Tags\TagSync;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->sync = app(TagSync::class);
});

test('the tags page lists my tags, the most used first', function () {
    $first = Stash::factory()->for($this->user)->create();
    $second = Stash::factory()->for($this->user)->create();
    $this->sync->addByUser($first, 'rare');
    $this->sync->addByUser($first, 'common');
    $this->sync->addByUser($second, 'common');
    Tag::factory()->create(['name' => 'somebody else']);

    $this->get('/tags')->assertRedirect('/login');

    $this
        ->actingAs($this->user)
        ->get('/tags')
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('tags/index')
                ->has('tags', 2)
                ->where('tags.0.name', 'common')
                ->where('tags.0.stashes_count', 2)
                ->where('tags.1.name', 'rare'),
        );
});

test('a tag is renamed everywhere', function () {
    $stash = Stash::factory()->for($this->user)->create();
    $tag = $this->sync->addByUser($stash, 'design');

    $this->actingAs($this->user)->from('/tags')->patch("/tags/{$tag->id}", [
        'name' => ' #Web Design ',
    ])->assertRedirect('/tags');

    $fresh = $tag->fresh();

    expect($fresh->name)
        ->toBe('Web Design')
        ->and($fresh->slug)
        ->toBe('web design')
        ->and($stash->tags()->pluck('tags.id')->all())
        ->toBe([$tag->id]);
});

test('a tag can change its case', function () {
    $tag = $this->sync->addByUser(Stash::factory()->for($this->user)->create(), 'design');

    $this->actingAs($this->user)->from('/tags')->patch("/tags/{$tag->id}", [
        'name' => 'Design',
    ])->assertRedirect('/tags');

    expect($tag->fresh()->name)->toBe('Design');
});

test('a name another tag has is refused', function () {
    $stash = Stash::factory()->for($this->user)->create();
    $this->sync->addByUser($stash, 'design');
    $other = $this->sync->addByUser($stash, 'ui');

    $this->actingAs($this->user)->from('/tags')->patch("/tags/{$other->id}", [
        'name' => 'DESIGN',
    ])->assertSessionHasErrors('name');

    expect($other->fresh()->name)->toBe('ui');
});

test('an empty name is refused', function () {
    $tag = $this->sync->addByUser(Stash::factory()->for($this->user)->create(), 'design');

    $this->actingAs($this->user)->from('/tags')->patch("/tags/{$tag->id}", [
        'name' => '#',
    ])->assertSessionHasErrors('name');
});

test('deleting a tag removes it from its stashes and keeps the stashes', function () {
    $stash = Stash::factory()->for($this->user)->create();
    $tag = $this->sync->addByUser($stash, 'design');
    $keep = $this->sync->addByUser($stash, 'keep');

    $this->actingAs($this->user)->from('/tags')->delete("/tags/{$tag->id}")->assertRedirect('/tags');

    expect(Tag::query()->find($tag->id))
        ->toBeNull()
        ->and($stash->tags()->pluck('tags.id')->all())
        ->toBe([$keep->id])
        ->and(Stash::query()->find($stash->id))
        ->not->toBeNull();
});
