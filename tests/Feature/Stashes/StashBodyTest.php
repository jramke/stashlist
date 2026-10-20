<?php

declare(strict_types=1);

use App\Models\Stash;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->create();
});

test('the feed says when it carries only the start of a text', function () {
    Stash::factory()
        ->for($this->user)
        ->note()
        ->create(['title' => 'long', 'body' => str_repeat('word ', times: 400)]);
    Stash::factory()->for($this->user)->note()->create(['title' => 'short', 'body' => 'a few words']);

    $this
        ->actingAs($this->user)
        ->get('/stashes')
        ->assertInertia(function (AssertableInertia $page) {
            $cut = collect($page->toArray()['props']['stashes']['data'])->pluck('body_cut', 'title')->all();

            expect($cut)->toBe(['short' => false, 'long' => true]);
        });
});

test('the whole text of a stash is one request away', function () {
    $stash = Stash::factory()
        ->for($this->user)
        ->note()
        ->create(['body' => str_repeat('word ', times: 400)]);

    $this
        ->actingAs($this->user)
        ->getJson("/stashes/{$stash->id}/body")
        ->assertOk()
        ->assertExactJson(['body' => str_repeat('word ', times: 400)]);
});

test('a guest cannot read the text of a stash', function () {
    $stash = Stash::factory()->for($this->user)->note()->create();

    $this->getJson("/stashes/{$stash->id}/body")->assertUnauthorized();
});
