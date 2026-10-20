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

test('the tags page shows fifty tags at a time and says where it is', function () {
    Tag::factory()
        ->count(120)
        ->for($this->user)
        ->sequence(
            fn ($sequence) => [
                'name' => sprintf('tag %03d', $sequence->index),
                'slug' => sprintf('tag %03d', $sequence->index),
            ],
        )
        ->create();

    $this
        ->actingAs($this->user)
        ->get('/tags')
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->has('tags', 50)
                ->where('paging', ['page' => 1, 'last_page' => 3, 'total' => 120]),
        );

    $this
        ->actingAs($this->user)
        ->get('/tags?page=3')
        ->assertInertia(
            fn (AssertableInertia $page) => $page->has('tags', 20)->where('paging.page', 3),
        );
});

test('a page that is gone leads to the last one', function () {
    Tag::factory()->count(60)->for($this->user)->create();

    $this->actingAs($this->user)->get('/tags?page=9')->assertRedirect('/tags?page=2');
});

test('tags are searched by the words in their names, and a percent sign is only a percent sign', function () {
    foreach (['kitchen garden', 'garage', 'sofa', '100% cotton'] as $name) {
        Tag::factory()->for($this->user)->create(['name' => $name, 'slug' => $name]);
    }

    $names = fn (AssertableInertia $page): array => array_column($page->toArray()['props']['tags'], 'name');

    $this
        ->actingAs($this->user)
        ->get('/tags?q=GAR')
        ->assertInertia(function (AssertableInertia $page) use ($names) {
            expect($names($page))->toEqualCanonicalizing(['kitchen garden', 'garage']);

            $page->where('q', 'GAR')->where('paging.total', 2);
        });

    $this
        ->actingAs($this->user)
        ->get('/tags?q=%25')
        ->assertInertia(fn (AssertableInertia $page) => expect($names($page))->toBe(['100% cotton']));

    $this
        ->actingAs($this->user)
        ->get('/tags?q=nothing')
        ->assertInertia(fn (AssertableInertia $page) => $page->has('tags', 0)->where('paging.total', 0));
});

test('the tags of other people are neither listed nor found', function () {
    Tag::factory()->create(['name' => 'garage', 'slug' => 'garage']);

    $this
        ->actingAs($this->user)
        ->get('/tags?q=garage')
        ->assertInertia(fn (AssertableInertia $page) => $page->has('tags', 0));
});

test('the list of every tag for the merge picker is sent only when asked for', function () {
    Tag::factory()->count(3)->for($this->user)->create();

    $this
        ->actingAs($this->user)
        ->get('/tags')
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->missing('options')
                ->reloadOnly('options', fn (AssertableInertia $reload) => $reload->has('options', 3)),
        );
});
