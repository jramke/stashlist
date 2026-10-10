<?php

declare(strict_types=1);

use App\Ai\Embedding\Embedders;
use App\Ai\Embedding\VectorCodec;
use App\Data\FeedFiltersData;
use App\Models\Stash;
use App\Models\StashEmbedding;
use App\Models\User;
use App\Search\SimilarStashes;
use App\Search\StashSearch;
use App\Search\TenantSearch;
use Meilisearch\Client;
use Meilisearch\Contracts\SimilarDocumentsQuery;
use Tests\Support\FakeAi;
use Tests\Support\FixedEmbedder;
use Tests\Support\RealMeilisearch;

uses()->group('meilisearch');

beforeEach(function () {
    FakeAi::install();
    app()->instance(Embedders::class, new Embedders(['text_v1' => new FixedEmbedder([])]));
    $this->meili = RealMeilisearch::start();

    // The search-only key a deployment makes with `stashlist:search-key`.
    $this->key = resolve(Client::class)->createKey([
        'name' => 'test-search',
        'actions' => ['search'],
        'indexes' => [new Stash()->searchableAs()],
        'expiresAt' => null,
    ]);
    config([
        'stashlist.search.tenant.key' => (string)$this->key->getKey(),
        'stashlist.search.tenant.uid' => (string)$this->key->getUid(),
    ]);

    $this->alice = User::factory()->create();
    $this->bob = User::factory()->create();
});

afterEach(function () {
    $this->meili?->drop();

    $key = $this->key ?? null;

    if ($key !== null) {
        resolve(Client::class)->deleteKey((string)$key->getUid());
    }
});

function indexed_with_vector(User $user, string $title, int $axis): Stash
{
    $stash = Stash::factory()->for($user)->create(['title' => $title, 'url' => null, 'domain' => null]);
    StashEmbedding::query()->create([
        'stash_id' => $stash->id,
        'embedder' => 'text_v1',
        'user_id' => $user->id,
        'model' => 'fake-embedding',
        'dimensions' => 16,
        'recipe_version' => 1,
        'input_hash' => hash('sha256', $title),
        'vector' => VectorCodec::pack(FixedEmbedder::axis($axis)),
    ]);
    $stash->searchable();

    return $stash;
}

test('tenant tokens are on only when a search key is set', function () {
    expect(resolve(TenantSearch::class)->enabled())->toBeTrue();

    config(['stashlist.search.tenant.key' => '']);

    expect(resolve(TenantSearch::class)->enabled())
        ->toBeFalse()
        ->and(resolve(TenantSearch::class)->indexFor($this->alice->id))
        ->toBeNull();
});

test('the engine itself shows a token only its own user\'s documents, even with no filter and with a filter for someone else', function () {
    $mine = indexed_with_vector($this->alice, 'Shared title', axis: 0);
    $theirs = indexed_with_vector($this->bob, 'Shared title', axis: 0);
    $this->meili->settle();
    $index = resolve(TenantSearch::class)->indexFor($this->alice->id);

    $everything = array_column($index?->rawSearch('', ['limit' => 50])['hits'] ?? [], 'id');
    $bobsOnly = array_column($index?->rawSearch('', ['filter' => "user_id = {$this->bob->id}"])['hits'] ?? [], 'id');

    expect($everything)->toBe([$mine->id])->and($bobsOnly)->toBeEmpty()->and($everything)->not->toContain($theirs->id);
});

test('a token cannot be used to look at another user\'s documents through similar documents either', function () {
    $mine = indexed_with_vector($this->alice, 'Mine', axis: 0);
    $theirs = indexed_with_vector($this->bob, 'Theirs', axis: 0);
    $this->meili->settle();
    $index = resolve(TenantSearch::class)->indexFor($this->alice->id);

    // Neighbours of my own document: only mine could be among them.
    $ownNeighbours = array_column(
        $index?->searchSimilarDocuments(new SimilarDocumentsQuery($mine->id, 'text_v1'))->toArray()['hits'] ?? [],
        'id',
    );
    expect($ownNeighbours)->not->toContain($theirs->id);

    // Asking about the neighbours of someone else's document is refused or empty, never an answer.
    $about = null;

    try {
        $about = $index?->searchSimilarDocuments(new SimilarDocumentsQuery($theirs->id, 'text_v1'))->toArray()['hits'];
    } catch (Meilisearch\Exceptions\ApiException) {
        $about = [];
    }

    expect($about)->toBeEmpty();
});

test('searching and more like this work through the token', function () {
    $mine = indexed_with_vector($this->alice, 'Sourdough starters', axis: 0);
    $near = indexed_with_vector($this->alice, 'Sourdough bread', axis: 0);
    indexed_with_vector($this->bob, 'Sourdough rolls', axis: 0);
    $this->meili->settle();
    $this->actingAs($this->alice);

    $found = resolve(StashSearch::class)
        ->search($this->alice, 'sourdough', new FeedFiltersData, 20)
        ->pluck('id')
        ->all();
    $similar = resolve(SimilarStashes::class)->for($mine)->pluck('id')->all();

    expect($found)->toEqualCanonicalizing([$mine->id, $near->id])->and($similar)->toBe([$near->id]);
});
