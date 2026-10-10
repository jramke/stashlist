<?php

declare(strict_types=1);

use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Tests\Support\FakeSearchEngine;

beforeEach(function () {
    $this->engine = FakeSearchEngine::install();
    $this->user = User::factory()->create();
});

/**
 * @param  list<string>  $names
 */
function colored_stash(User $user, string $title, array $names): Stash
{
    $stash = Stash::factory()->for($user)->create(['title' => $title]);
    StashEnrichment::query()->create([
        'stash_id' => $stash->id,
        'user_id' => $user->id,
        'color_names' => $names,
    ]);

    return $stash;
}

test('the feed can be narrowed to pictures with a color among their dominant ones', function () {
    colored_stash($this->user, 'Red shoes', ['red', 'white']);
    colored_stash($this->user, 'Blue sky', ['blue']);
    colored_stash($this->user, 'Red and blue flag', ['blue', 'red']);
    Stash::factory()->for($this->user)->create(['title' => 'No colors']);

    $response = $this->actingAs($this->user)->get('/stashes?color=red');

    expect(array_column($response->viewData('page')['props']['stashes']['data'], 'title'))
        ->toEqualCanonicalizing(['Red shoes', 'Red and blue flag']);
    $response->assertInertia(fn (AssertableInertia $page) => $page->where('filters.color', 'red'));
});

test('the color filter works together with the type filter and never shows another user\'s pictures', function () {
    colored_stash($this->user, 'Mine', ['red']);
    colored_stash(User::factory()->create(), 'Theirs', ['red']);

    $response = $this->actingAs($this->user)->get('/stashes?color=red&type=link');

    expect(array_column($response->viewData('page')['props']['stashes']['data'], 'title'))->toBe(['Mine']);
    expect(array_column(
        $this->actingAs($this->user)->get('/stashes?color=red&type=note')->viewData('page')['props']['stashes']['data'],
        'title',
    ))
        ->toBeEmpty();
});

test('a color that is not one of the twelve names is refused', function () {
    $this->actingAs($this->user)->get('/stashes?color=chartreuse')->assertSessionHasErrors('color');
});

test('a search with a color asks the engine for that color too', function () {
    $this->engine->hits = [];

    $this->actingAs($this->user)->get('/stashes?q=sneakers&color=red&mode=keyword')->assertOk();

    expect(array_column($this->engine->searches[0]->wheres, 'value', 'field'))->toBe([
        'user_id' => $this->user->id,
        'colors' => 'red',
    ]);
});

test('the search document names the colors', function () {
    $stash = colored_stash($this->user, 'Red shoes', ['red', 'white']);

    expect($stash->load(Stash::SEARCH_RELATIONS)->toSearchableArray()['colors'])->toBe(['red', 'white']);
});
