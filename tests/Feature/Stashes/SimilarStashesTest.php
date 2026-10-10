<?php

declare(strict_types=1);

use App\Models\Stash;
use App\Models\StashEmbedding;
use App\Models\User;
use App\Search\SimilarStashes;
use App\Tags\TagSync;
use Inertia\Testing\AssertableInertia;
use Meilisearch\Client;
use Meilisearch\Contracts\SimilarDocumentsQuery;
use Meilisearch\Endpoints\Indexes;
use Meilisearch\Exceptions\CommunicationException;
use Meilisearch\Search\SimilarDocumentsSearchResult;
use Tests\Support\FakeAi;
use Tests\Support\FakeSearchEngine;

beforeEach(function () {
    FakeAi::install();
    FakeSearchEngine::install();
    $this->user = User::factory()->create();
});

/**
 * @param  list<string>  $tags
 */
function tagged_stash(User $user, string $title, array $tags): Stash
{
    $stash = Stash::factory()->for($user)->create(['title' => $title]);

    foreach ($tags as $tag) {
        app(TagSync::class)->addByUser($stash, $tag);
    }

    return $stash;
}

function with_vector(Stash $stash): Stash
{
    StashEmbedding::query()->create([
        'stash_id' => $stash->id,
        'embedder' => 'text_v1',
        'user_id' => $stash->user_id,
        'model' => 'fake-embedding',
        'dimensions' => 16,
        'recipe_version' => 1,
        'input_hash' => str_repeat('a', 64),
        'vector' => App\Ai\Embedding\VectorCodec::pack(array_fill(0, 16, 0.25)),
    ]);

    return $stash;
}

/**
 * An engine that answers the similar-documents request with these ids, and remembers what it was asked.
 *
 * @param  list<int>  $ids
 */
function engine_answering(array $ids, ?Throwable $failure = null): ArrayObject
{
    $asked = new ArrayObject;
    $index = Mockery::mock(Indexes::class);
    $index
        ->shouldReceive('searchSimilarDocuments')
        ->andReturnUsing(function (SimilarDocumentsQuery $query) use (
            $ids,
            $failure,
            $asked,
        ): SimilarDocumentsSearchResult {
            $asked->append($query->toArray());

            if ($failure !== null) {
                throw $failure;
            }

            return new SimilarDocumentsSearchResult([
                'id' => '1',
                'hits' => array_map(static fn (int $id): array => ['id' => $id], $ids),
                'processingTimeMs' => 1,
                'offset' => 0,
                'limit' => 12,
                'estimatedTotalHits' => count($ids),
            ]);
        });
    $client = Mockery::mock(Client::class);
    $client->shouldReceive('index')->andReturn($index);
    app()->instance(Client::class, $client);

    return $asked;
}

test('without a vector, stashes that share tags are the neighbours, the most shared first', function () {
    $base = tagged_stash($this->user, 'Base', ['bread', 'baking', 'yeast']);
    $three = tagged_stash($this->user, 'Shares three', ['bread', 'baking', 'yeast']);
    $one = tagged_stash($this->user, 'Shares one', ['yeast', 'cheese']);
    $two = tagged_stash($this->user, 'Shares two', ['bread', 'baking']);
    tagged_stash($this->user, 'Shares none', ['cheese']);

    $titles = app(SimilarStashes::class)->for($base)->pluck('title')->all();

    expect($titles)->toBe(['Shares three', 'Shares two', 'Shares one']);
});

test('a dismissed tag does not make two stashes alike', function () {
    $base = tagged_stash($this->user, 'Base', ['bread']);
    $other = tagged_stash($this->user, 'Other', ['bread']);
    $tag = $other->tags()->firstOrFail();
    $other->tags()->updateExistingPivot($tag->id, ['source' => 'ai', 'dismissed_at' => now()]);

    expect(app(SimilarStashes::class)->for($base))->toHaveCount(0);
});

test('another user\'s stashes are never neighbours, whatever their tags are called', function () {
    $base = tagged_stash($this->user, 'Base', ['bread']);
    tagged_stash(User::factory()->create(), 'Theirs', ['bread']);

    expect(app(SimilarStashes::class)->for($base))->toHaveCount(0);
});

test('with a vector the engine names the neighbours, limited to the owner', function () {
    $base = with_vector(tagged_stash($this->user, 'Base', []));
    $near = tagged_stash($this->user, 'Near', []);
    $nearer = tagged_stash($this->user, 'Nearer', []);
    $asked = engine_answering([$nearer->id, $near->id]);

    $titles = app(SimilarStashes::class)->for($base)->pluck('title')->all();

    expect($titles)
        ->toBe(['Nearer', 'Near'])
        ->and($asked[0])
        ->toMatchArray([
            'id' => $base->id,
            'embedder' => 'text_v1',
            'filter' => ["user_id = {$this->user->id}"],
            'limit' => 12,
            'rankingScoreThreshold' => 0.5,
        ]);
});

test('what the engine answers for someone else is dropped when the page loads', function () {
    $base = with_vector(tagged_stash($this->user, 'Base', []));
    $mine = tagged_stash($this->user, 'Mine', []);
    $theirs = tagged_stash(User::factory()->create(), 'Theirs', []);
    engine_answering([$theirs->id, $mine->id]);

    expect(app(SimilarStashes::class)->for($base)->pluck('title')->all())->toBe(['Mine']);
});

test('when little is near, the stashes with shared tags fill the list, after the near ones', function () {
    $base = with_vector(tagged_stash($this->user, 'Base', ['bread']));
    $near = tagged_stash($this->user, 'Near', []);
    $tagged = tagged_stash($this->user, 'Tagged', ['bread']);
    engine_answering([$near->id]);

    expect(app(SimilarStashes::class)->for($base)->pluck('title')->all())->toBe(['Near', 'Tagged']);
});

test('when the engine cannot answer the tags do', function () {
    $base = with_vector(tagged_stash($this->user, 'Base', ['bread']));
    tagged_stash($this->user, 'Tagged', ['bread']);
    engine_answering([], new CommunicationException('down'));

    expect(app(SimilarStashes::class)->for($base)->pluck('title')->all())->toBe(['Tagged']);
});

test('the detail page loads its neighbours after the page itself', function () {
    $base = tagged_stash($this->user, 'Base', ['bread']);
    tagged_stash($this->user, 'Tagged', ['bread']);

    $this
        ->actingAs($this->user)
        ->get("/stashes/{$base->id}")
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('stashes/show')
            ->missing('similar')
            ->loadDeferredProps(
                fn (AssertableInertia $deferred) => $deferred->has('similar', 1)->where('similar.0.title', 'Tagged'),
            ));
});
