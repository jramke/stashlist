<?php

declare(strict_types=1);

use App\Ai\Embedding\Embedders;
use App\Ai\Embedding\VectorCodec;
use App\Data\FeedFiltersData;
use App\Enums\SearchMode;
use App\Models\Stash;
use App\Models\StashEmbedding;
use App\Models\User;
use App\Search\SimilarStashes;
use App\Search\StashSearch;
use Tests\Support\FakeAi;
use Tests\Support\FixedEmbedder;
use Tests\Support\RealMeilisearch;

uses()->group('meilisearch');

const QUERY = 'that article about raising a lively culture';

beforeEach(function () {
    FakeAi::install();
    app()->instance(Embedders::class, new Embedders(['text_v1' => new FixedEmbedder([
        QUERY => FixedEmbedder::axis(0),
    ])]));
    $this->meili = RealMeilisearch::start();
    $this->user = User::factory()->create();
});

afterEach(function () {
    $this->meili?->drop();
});

/**
 * A stash with a vector along one axis, pushed to the index with it.
 */
function vectored(User $user, string $title, ?int $axis, float $mix = 0.0): Stash
{
    $stash = Stash::factory()->for($user)->create(['title' => $title, 'url' => null, 'domain' => null]);

    if ($axis !== null) {
        $vector = FixedEmbedder::axis($axis);
        // A little of the next axis makes this one a close neighbour of the axis, not the axis itself.
        $vector[($axis + 1) % 16] = $mix;

        StashEmbedding::query()->create([
            'stash_id' => $stash->id,
            'embedder' => 'text_v1',
            'user_id' => $user->id,
            'model' => 'fake-embedding',
            'dimensions' => 16,
            'recipe_version' => 1,
            'input_hash' => hash('sha256', $title),
            'vector' => VectorCodec::pack($vector),
        ]);
    }

    $stash->searchable();

    return $stash;
}

/**
 * @return list<int>
 */
function matches(User $user, string $text, SearchMode $mode = SearchMode::Hybrid): array
{
    test()->meili->settle();
    test()->actingAs($user);

    return array_map(
        intval(...),
        resolve(StashSearch::class)
            ->search($user, $text, new FeedFiltersData, perPage: 60, mode: $mode)
            ->pluck('id')
            ->all(),
    );
}

test('a stash is found by its meaning when it shares no word with the query', function () {
    $sourdough = vectored($this->user, 'Sourdough starters', axis: 0);
    vectored($this->user, 'Quarterly report', axis: 5);

    expect(matches($this->user, QUERY)[0])->toBe($sourdough->id);
    // On words alone nothing matches: that is the point of the vectors.
    expect(matches($this->user, QUERY, SearchMode::Keyword))->toBeEmpty();
});

test('a stash without a vector is still found by its words in a hybrid search', function () {
    $plain = vectored($this->user, 'Culture of raising sheep', axis: null);

    expect(matches($this->user, 'raising culture sheep'))->toContain($plain->id);
});

test('another user\'s vector never shows up, however near it is', function () {
    vectored($this->user, 'Mine', axis: 3);
    $theirs = vectored(User::factory()->create(), 'Theirs', axis: 0);

    expect(matches($this->user, QUERY))->not->toContain($theirs->id);
});

test('more like this finds the near neighbours of the same user only', function () {
    $base = vectored($this->user, 'Base', axis: 0);
    $near = vectored($this->user, 'Near', axis: 0, mix: 0.2);
    vectored($this->user, 'Far', axis: 8);
    $theirs = vectored(User::factory()->create(), 'Theirs', axis: 0);
    $this->meili->settle();
    $this->actingAs($this->user);

    $ids = resolve(SimilarStashes::class)->for($base)->pluck('id')->all();

    expect($ids)->toContain($near->id)->not->toContain($theirs->id)->not->toContain($base->id);
});

test('the spike tool loads documents with vectors and times the searches', function () {
    $this
        ->artisan('stashlist:search-spike', ['--docs' => 300, '--users' => 5, '--dimensions' => 16, '--queries' => 5])
        ->expectsOutputToContain('Indexed 300 documents')
        ->assertSuccessful();
});
