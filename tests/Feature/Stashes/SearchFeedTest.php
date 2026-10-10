<?php

declare(strict_types=1);

use App\Models\Stash;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia;
use Tests\Support\FakeSearchEngine;

beforeEach(function () {
    $this->engine = FakeSearchEngine::install();
    $this->user = User::factory()->create();
});

function search_titles(Illuminate\Testing\TestResponse $response): array
{
    return array_column($response->viewData('page')['props']['stashes']['data'], 'title');
}

test('a text query lists the matches in the order the engine ranks them', function () {
    $alpha = Stash::factory()->for($this->user)->create(['title' => 'Alpha']);
    $beta = Stash::factory()->for($this->user)->create(['title' => 'Beta']);
    Stash::factory()->for($this->user)->create(['title' => 'No match']);
    $this->engine->hits = [$beta->id, $alpha->id];

    $response = $this->actingAs($this->user)->get('/stashes?q=bread');

    $response->assertInertia(
        fn (AssertableInertia $page) => $page->component('stashes/index')->where('filters.q', 'bread'),
    );
    expect(search_titles($response))->toBe(['Beta', 'Alpha']);
});

test('the engine is asked for my stashes only, and a stray hit of someone else is dropped', function () {
    $mine = Stash::factory()->for($this->user)->create(['title' => 'Mine']);
    $theirs = Stash::factory()->for(User::factory()->create())->create(['title' => 'Theirs']);
    $this->engine->hits = [$theirs->id, $mine->id];

    $response = $this->actingAs($this->user)->get('/stashes?q=bread');

    expect($this->engine->searches)
        ->toHaveCount(1)
        ->and($this->engine->searches[0]->wheres[0])
        ->toBe(['field' => 'user_id', 'operator' => '=', 'value' => $this->user->id])
        ->and(search_titles($response))
        ->toBe(['Mine']);
});

test('the feed without a query does not use the engine', function () {
    Stash::factory()->for($this->user)->create();

    $this->actingAs($this->user)->get('/stashes')->assertOk();
    $this->actingAs($this->user)->get('/stashes?q=')->assertOk();
    $this->actingAs($this->user)->get('/stashes?q=%20%20')->assertOk();

    expect($this->engine->searches)->toBeEmpty();
});

test('the type filter goes to the engine and the status filter is left out of a search', function () {
    $this->engine->hits = [];

    $this->actingAs($this->user)->get('/stashes?q=bread&type=note&status=failed')->assertOk();

    expect(array_column($this->engine->searches[0]->wheres, 'value', 'field'))->toBe([
        'user_id' => $this->user->id,
        'type' => 'note',
    ]);
});

test('both phases of the as-you-type contract are accepted, anything else is not', function () {
    $this->engine->hits = [];

    $this->actingAs($this->user)->get('/stashes?q=bread&mode=keyword')->assertOk();
    $this->actingAs($this->user)->get('/stashes?q=bread&mode=hybrid')->assertOk();
    $this->actingAs($this->user)->get('/stashes?q=bread&mode=magic')->assertSessionHasErrors('mode');
    $this
        ->actingAs($this->user)
        ->get('/stashes?q='.str_repeat(string: 'a', times: 201))
        ->assertSessionHasErrors('q');
});

test('only a search is rate limited, 90 a minute per user', function () {
    $limiter = RateLimiter::limiter('search');
    $withText = Request::create('/stashes', 'GET', ['q' => 'bread']);
    $plain = Request::create('/stashes', 'GET');

    expect(Route::getRoutes()->getByName('stashes.index')?->gatherMiddleware())
        ->toContain('throttle:search')
        ->and($limiter($withText)->maxAttempts)
        ->toBe(90)
        ->and($limiter($plain)->maxAttempts)
        ->toBeGreaterThan(90_000);
});
