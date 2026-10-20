<?php

declare(strict_types=1);

use App\Models\Stash;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Tests\Support\FakeSearchEngine;

beforeEach(function () {
    $this->engine = FakeSearchEngine::install();
    $this->user = User::factory()->create();
});

function titles_of(Illuminate\Testing\TestResponse $response): array
{
    return array_column($response->viewData('page')['props']['stashes']['data'], 'title');
}

test('the feed can be narrowed to one kind of link', function () {
    Stash::factory()->for($this->user)->create(['title' => 'A post', 'subtype' => 'article']);
    Stash::factory()->for($this->user)->create(['title' => 'A chair', 'subtype' => 'product']);
    Stash::factory()->for($this->user)->create(['title' => 'Not sorted', 'subtype' => null]);
    Stash::factory()->for(User::factory()->create())->create(['title' => 'Theirs', 'subtype' => 'article']);

    $response = $this->actingAs($this->user)->get('/stashes?subtype=article');

    expect(titles_of($response))->toBe(['A post']);
    $response->assertInertia(fn (AssertableInertia $page) => $page->where('filters.subtype', 'article'));
});

test('a kind that is not on the list is refused', function () {
    $this->actingAs($this->user)->get('/stashes?subtype=gadget')->assertSessionHasErrors('subtype');
});

test('the kind goes to the engine with a search', function () {
    $this->engine->hits = [];

    $this->actingAs($this->user)->get('/stashes?q=bread&subtype=recipe')->assertOk();

    expect(array_column($this->engine->searches[0]->wheres, 'value', 'field'))->toBe([
        'user_id' => $this->user->id,
        'subtype' => 'recipe',
    ]);
});
