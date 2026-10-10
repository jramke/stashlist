<?php

declare(strict_types=1);

use App\Ai\Embedding\Embedders;
use App\Data\FeedFiltersData;
use App\Enums\SearchMode;
use App\Models\Stash;
use App\Models\User;
use App\Search\StashSearch;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Meilisearch\Endpoints\Indexes;
use Tests\Support\FakeAi;
use Tests\Support\FakeSearchEngine;
use Tests\Support\SpyEmbedder;

beforeEach(function () {
    FakeAi::install();
    $this->embedder = new SpyEmbedder;
    app()->instance(Embedders::class, new Embedders(['text_v1' => $this->embedder]));
    $this->engine = FakeSearchEngine::install();
    $this->user = User::factory()->create();
    $this->search = app(StashSearch::class);
});

/**
 * @return array<string, mixed>
 */
function options_of(string $text, SearchMode $mode = SearchMode::Hybrid, ?User $user = null): array
{
    return test()->search->builder($user ?? test()->user, $text, new FeedFiltersData, $mode)->options;
}

test('a hybrid search sends the vector of the query, the embedder, a ratio and a threshold', function () {
    $options = options_of('that article about sourdough starters');

    expect($options)
        ->toHaveKeys(['vector', 'hybrid', 'rankingScoreThreshold'])
        ->and($options['vector'])
        ->toHaveCount(16)
        ->and($options['hybrid'])
        ->toBe(['embedder' => 'text_v1', 'semanticRatio' => 0.7])
        ->and($options['rankingScoreThreshold'])
        ->toBe(0.35)
        ->and($this->embedder->calls)
        ->toBe([['that article about sourdough starters']]);
});

test('the more words, the more the meaning counts', function (string $query, float $ratio) {
    expect(options_of($query)['hybrid']['semanticRatio'])->toBe($ratio);
})->with([
    'one word' => ['sourdough', 0.3],
    'two words' => ['sourdough starter', 0.5],
    'three words' => ['sourdough starter recipe', 0.7],
    'a sentence' => ['that article about sourdough starters', 0.7],
]);

test('the keyword mode calls no provider at all', function () {
    expect(options_of('sourdough starter recipe', SearchMode::Keyword))->toBeEmpty();
    expect($this->embedder->calls)->toBeEmpty();
});

test('a query shorter than three characters stays a keyword search', function () {
    expect(options_of('ik'))->toBeEmpty();
    expect($this->embedder->calls)->toBeEmpty();
});

test('with smart features off the search is on words alone and nothing is embedded', function () {
    $user = User::factory()->create(['ai_enabled' => false]);

    expect(options_of('sourdough starter recipe', user: $user))->toBeEmpty();
    expect($this->embedder->calls)->toBeEmpty();
});

test('an instance without AI searches on words alone too', function () {
    config(['stashlist.ai.enabled' => false]);

    expect(options_of('sourdough starter recipe'))->toBeEmpty();
    expect($this->embedder->calls)->toBeEmpty();
});

test('when the provider fails the search still runs, on words, and the query is not logged', function () {
    Log::spy();
    $this->embedder->failure = new RuntimeException('secret query text in a message');

    expect(options_of('my private query here'))->toBeEmpty();

    Log::shouldHaveReceived('warning')
        ->once()
        ->withArgs(
            fn (string $message, array $context): bool => (
                $context === ['exception' => RuntimeException::class] &&
                ! str_contains($message, 'private')
            ),
        );
});

test('a query is embedded once, however often it is asked', function () {
    options_of('sourdough starter recipe');
    options_of('  Sourdough   Starter recipe ');
    options_of('sourdough starter recipe');

    expect($this->embedder->calls)->toHaveCount(1);

    Cache::flush();
    options_of('sourdough starter recipe');

    expect($this->embedder->calls)->toHaveCount(2);
});

test('a vector of the wrong size is not sent', function () {
    $this->embedder->answerWithDimensions = 4;

    expect(options_of('sourdough starter recipe'))->toBeEmpty();
});

test('the vector and the owner filter both reach the engine', function () {
    $builder = $this->search->builder($this->user, 'sourdough starter recipe', new FeedFiltersData);
    $sent = [];
    $index = Mockery::mock(Indexes::class);
    $index
        ->shouldReceive('rawSearch')
        ->once()
        ->andReturnUsing(function (string $text, array $options) use (&$sent): array {
            $sent = $options;

            return ['hits' => []];
        });

    ($builder->callback)($index, $builder->query, ['filter' => "user_id={$this->user->id}", ...$builder->options]);

    expect($sent)
        ->toHaveKeys(['filter', 'vector', 'hybrid', 'rankingScoreThreshold'])
        ->and($sent['filter'])
        ->toBe("user_id={$this->user->id}");
});

test('the feed asks for the mode in the address', function () {
    Stash::factory()->for($this->user)->create();

    $this->actingAs($this->user)->get('/stashes?q=sourdough+starter&mode=keyword')->assertOk();
    $this->actingAs($this->user)->get('/stashes?q=sourdough+starter&mode=hybrid')->assertOk();
    // Nothing said: the better search, as when a search address is opened directly.
    $this->actingAs($this->user)->get('/stashes?q=sourdough+starter')->assertOk();

    expect($this->engine->searches[0]->options)
        ->toBeEmpty()
        ->and($this->engine->searches[1]->options)
        ->toHaveKey('vector')
        ->and($this->engine->searches[2]->options)
        ->toHaveKey('vector');

    $this->actingAs($this->user)->get('/stashes?q=sourdough&mode=nonsense')->assertSessionHasErrors('mode');
});
