<?php

declare(strict_types=1);

namespace App\Search;

use App\Models\Stash;
use App\Models\StashEmbedding;
use App\Stashes\FeedQuery;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Meilisearch\Client;
use Meilisearch\Contracts\SimilarDocumentsQuery;
use Meilisearch\Exceptions\ExceptionInterface;

/**
 * "More like this": the stashes of the same user closest to one stash. The nearest neighbours come from the
 * search index, from the vector stored for the stash (no provider is called, so it also works with smart
 * features off); what is missing, because the stash has no vector yet or little is near, is filled up with the
 * stashes that share the most tags. Tags belong to one user, so the fill-up cannot cross users.
 *
 * Like StashSearch, it limits the engine to the owner and loads the result through the Stash model.
 */
final class SimilarStashes
{
    /** A neighbour must be at least this similar (0 to 1) to count. */
    private const THRESHOLD = 0.5;

    public function __construct(
        private readonly Client $engine,
        private readonly TenantSearch $tenant,
    ) {}

    /**
     * @return Collection<int, Stash> closest first, at most $limit
     */
    public function for(Stash $stash, int $limit = 12): Collection
    {
        $ids = $this->nearest($stash, $limit);

        if (count($ids) < $limit) {
            $ids = [...$ids, ...array_diff($this->byTags($stash, $limit), $ids)];
        }

        return $this->load($stash, array_slice($ids, offset: 0, length: $limit));
    }

    /**
     * @return list<int>
     */
    private function nearest(Stash $stash, int $limit): array
    {
        /** @var non-empty-string $embedder */
        $embedder = config()->string('stashlist.search.embedder');
        $stored = StashEmbedding::query()->where('stash_id', $stash->id)->where('embedder', $embedder)->exists();

        if (! $stored) {
            return [];
        }

        try {
            // With a search key the request goes out under a token that only sees this user's documents.
            $index = $this->tenant->indexFor($stash->user_id) ?? $this->engine->index($stash->searchableAs());
            $result = $index->searchSimilarDocuments(
                new SimilarDocumentsQuery($stash->id, $embedder)
                    ->setFilter(["user_id = {$stash->user_id}"])
                    ->setLimit(max(1, $limit))
                    ->setAttributesToRetrieve(['id'])
                    ->setRankingScoreThreshold(self::THRESHOLD),
            );
        } catch (ExceptionInterface $failure) {
            // The stash may not be indexed yet, or the engine is down: the tags still tell something.
            report($failure);

            return [];
        }

        /** @var array{hits?: list<array{id?: int|string}>} $body */
        $body = $result->toArray();

        return array_values(array_map(static fn (array $hit): int => (int)($hit['id'] ?? 0), $body['hits'] ?? []));
    }

    /**
     * @return list<int> ids of the user's other stashes, the most shared tags first
     */
    private function byTags(Stash $stash, int $limit): array
    {
        $tagIds = $stash->visibleTags()->pluck('tags.id')->all();

        if ($tagIds === []) {
            return [];
        }

        return array_values(array_map(
            intval(...),
            Stash::query()
                ->where('user_id', $stash->user_id)
                ->whereKeyNot($stash->id)
                ->withCount([
                    'visibleTags as shared_tags' => static fn (Builder $tags) => $tags->whereIn('tags.id', $tagIds),
                ])
                ->having('shared_tags', '>', 0)
                ->orderByDesc('shared_tags')
                ->orderByDesc('id')
                ->limit($limit)
                ->pluck('id')
                ->all(),
        ));
    }

    /**
     * @param  list<int>  $ids
     * @return Collection<int, Stash>
     */
    private function load(Stash $stash, array $ids): Collection
    {
        if ($ids === []) {
            return new Collection;
        }

        $positions = array_flip($ids);

        return Stash::query()
            ->where('user_id', $stash->user_id)
            ->whereKey($ids)
            ->with(FeedQuery::EAGER)
            ->get()
            ->sortBy(static fn (Stash $found): int => $positions[$found->id])
            ->values();
    }
}
