<?php

declare(strict_types=1);

use App\Data\FeedFiltersData;
use App\Enums\StashType;
use App\Models\User;
use App\Search\StashSearch;
use Meilisearch\Endpoints\Indexes;

/**
 * The where() calls of a builder as the filter terms they become.
 *
 * @return list<string>
 */
function terms(Laravel\Scout\Builder $builder): array
{
    return array_map(
        static fn (array $where): string => $where['field'].$where['operator'].$where['value'],
        $builder->wheres,
    );
}

/**
 * What the Scout callback hands to the engine, given the filter Scout built from the where() calls.
 *
 * @return array<string, mixed>
 */
function filter_sent_to_engine(Laravel\Scout\Builder $builder, string $scoutFilter): array
{
    $sent = [];
    $index = Mockery::mock(Indexes::class);
    $index
        ->shouldReceive('rawSearch')
        ->once()
        ->andReturnUsing(function (string $text, array $options) use (&$sent): array {
            $sent = [$text, $options];

            return ['hits' => []];
        });

    ($builder->callback)($index, $builder->query, ['filter' => $scoutFilter]);

    return $sent;
}

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->search = app(StashSearch::class);
});

test('the owner is the first thing the engine query asks for, taken from the user and not the request', function () {
    $builder = $this->search->builder($this->user, ' sourdough ', new FeedFiltersData(type: StashType::Link));

    expect($builder->query)
        ->toBe('sourdough')
        ->and(terms($builder))
        ->toBe(["user_id={$this->user->id}", 'type=link']);
});

test('every tag is required and a collection is one id', function () {
    $builder = $this->search->builder($this->user, 'bread', new FeedFiltersData(tags: [5, 7], collection: '12'));

    expect(terms($builder))->toBe(["user_id={$this->user->id}", 'tag_ids=5', 'tag_ids=7', 'collection_ids=12']);
});

test('a stash in no collection is a filter the callback adds', function () {
    $builder = $this->search->builder($this->user, 'bread', new FeedFiltersData(tags: [5], collection: 'none'));

    [$text, $options] = filter_sent_to_engine($builder, "user_id={$this->user->id} AND tag_ids=5");

    expect(terms($builder))
        ->toBe(["user_id={$this->user->id}", 'tag_ids=5'])
        ->and($text)
        ->toBe('bread')
        ->and($options['filter'])
        ->toBe("user_id={$this->user->id} AND tag_ids=5 AND collection_ids IS EMPTY");
});

test('a search without the owner filter does not run', function (string $scoutFilter) {
    $builder = $this->search->builder($this->user, 'bread', new FeedFiltersData);
    $index = Mockery::mock(Indexes::class);
    $index->shouldNotReceive('rawSearch');

    expect(fn () => ($builder->callback)($index, $builder->query, [
        'filter' => $scoutFilter,
    ]))->toThrow(LogicException::class);
})->with([
    'no filter at all' => [''],
    'another filter only' => ['type="link"'],
    'another user' => ['user_id=999999'],
    'the owner id as a prefix of a longer id' => fn () => 'user_id='.$this->user->id.'0',
]);

test('options Scout set besides the filter are passed on', function () {
    $builder = $this->search->builder($this->user, 'bread', new FeedFiltersData);
    $index = Mockery::mock(Indexes::class);
    $index
        ->shouldReceive('rawSearch')
        ->once()
        ->with('bread', ['filter' => "user_id={$this->user->id}", 'hitsPerPage' => 60, 'page' => 2])
        ->andReturn(['hits' => []]);

    ($builder->callback)($index, $builder->query, [
        'filter' => "user_id={$this->user->id}",
        'hitsPerPage' => 60,
        'page' => 2,
    ]);
});
