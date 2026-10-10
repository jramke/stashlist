<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Database\Eloquent\Collection;
use Laravel\Scout\Builder;
use Laravel\Scout\EngineManager;
use Laravel\Scout\Engines\NullEngine;
use Throwable;

/**
 * A search engine for tests: it keeps the documents it is given, remembers every search and answers with the
 * ids a test sets. How real Meilisearch behaves is covered by the tests in the "meilisearch" group.
 */
final class FakeSearchEngine extends NullEngine
{
    /** @var array<int, array<string, mixed>> the latest document of each indexed stash, by stash id */
    public array $documents = [];

    /** @var list<int> */
    public array $deleted = [];

    /** @var list<Builder> */
    public array $searches = [];

    /** @var list<int> what every search answers with, best match first */
    public array $hits = [];

    /** When set, every search fails with this. */
    public ?Throwable $failure = null;

    /**
     * Makes this the engine of the app; call it before the models that should be indexed are created.
     */
    public static function install(): self
    {
        $engine = new self;

        resolve(EngineManager::class)->extend('fake', static fn (): FakeSearchEngine => $engine);
        config(['scout.driver' => 'fake']);

        return $engine;
    }

    #[\Override]
    public function update($models)
    {
        foreach ($models as $model) {
            $this->documents[$model->getScoutKey()] = $model->toSearchableArray();
        }
    }

    #[\Override]
    public function delete($models)
    {
        foreach ($models as $model) {
            unset($this->documents[$model->getScoutKey()]);
            $this->deleted[] = $model->getScoutKey();
        }
    }

    #[\Override]
    public function search(Builder $builder)
    {
        $this->searches[] = $builder;

        if ($this->failure !== null) {
            throw $this->failure;
        }

        return ['hits' => $this->hitsOf($this->hits), 'totalHits' => count($this->hits)];
    }

    #[\Override]
    public function paginate(Builder $builder, $perPage, $page)
    {
        $this->searches[] = $builder;

        if ($this->failure !== null) {
            throw $this->failure;
        }

        return [
            'hits' => $this->hitsOf(array_slice($this->hits, ($page - 1) * $perPage, $perPage)),
            'totalHits' => count($this->hits),
        ];
    }

    #[\Override]
    public function mapIds($results)
    {
        return collect($results['hits'])->pluck('id')->values();
    }

    #[\Override]
    public function map(Builder $builder, $results, $model)
    {
        $ids = array_column($results['hits'], 'id');

        if ($ids === []) {
            return new Collection;
        }

        // Like the Meilisearch engine: hydrate through the model's own query, keep the engine's order.
        $positions = array_flip($ids);

        return $model
            ->getScoutModelsByIds($builder, $ids)
            ->sortBy(static fn ($found) => $positions[$found->getScoutKey()])
            ->values();
    }

    #[\Override]
    public function getTotalCount($results)
    {
        return $results['totalHits'];
    }

    /**
     * @param  list<int>  $ids
     * @return list<array{id: int}>
     */
    private function hitsOf(array $ids): array
    {
        return array_map(static fn (int $id): array => ['id' => $id], $ids);
    }
}
