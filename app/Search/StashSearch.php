<?php

declare(strict_types=1);

namespace App\Search;

use App\Ai\QueryEmbedder;
use App\Data\FeedFiltersData;
use App\Enums\SearchMode;
use App\Models\Stash;
use App\Models\User;
use App\Stashes\FeedQuery;
use Closure;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Pagination\LengthAwarePaginator;
use Laravel\Scout\Builder;
use LogicException;
use Meilisearch\Endpoints\Indexes;
use Meilisearch\Exceptions\ExceptionInterface;

/**
 * Text search over one user's stashes, the only caller of the search engine (an arch test keeps it that way).
 *
 * The engine holds every user's documents in one index, so the owner filter is what keeps users apart. It is
 * added before anything else, comes from the User object and never from the request, and the search refuses to
 * run without it. As a second layer the results are loaded through the Stash model, whose ownership scope drops
 * rows of other users.
 */
final class StashSearch
{
    public function __construct(
        private readonly QueryEmbedder $queryEmbedder,
    ) {}

    /**
     * One page of the stashes that match the text, best match first.
     *
     * @return LengthAwarePaginator<int, Stash>
     *
     * @throws SearchUnavailable when the engine cannot be reached or is not set up
     */
    public function search(
        User $user,
        string $text,
        FeedFiltersData $filters,
        int $perPage,
        SearchMode $mode = SearchMode::Hybrid,
    ): LengthAwarePaginator {
        try {
            /** @var LengthAwarePaginator<int, Stash> */
            return $this
                ->builder($user, $text, $filters, $mode)
                ->query(static fn (EloquentBuilder $stashes): EloquentBuilder => $stashes->with(FeedQuery::EAGER))
                ->paginate($perPage);
        } catch (ExceptionInterface $failure) {
            report($failure);

            throw SearchUnavailable::because($failure);
        }
    }

    /**
     * The engine query before it runs. Public for the tests that check what it asks for.
     *
     * @return Builder<Stash>
     */
    public function builder(
        User $user,
        string $text,
        FeedFiltersData $filters,
        SearchMode $mode = SearchMode::Hybrid,
    ): Builder {
        // The owner comes first and from the User object. Nothing below may replace it.
        $search = Stash::search(trim($text), $this->guarded($user, $filters))->where(
            'user_id',
            $user->id,
        );

        $semantic = $this->semantic($user, trim($text), $mode);

        if ($semantic !== []) {
            $search->options($semantic);
        }

        if ($filters->type !== null) {
            $search->where('type', $filters->type->value);
        }

        // Every tag is required, so every tag is a filter of its own.
        foreach ($filters->tags as $tagId) {
            $search->where('tag_ids', $tagId);
        }

        if ($filters->collection !== null && $filters->collection !== 'none') {
            $search->where('collection_ids', (int)$filters->collection);
        }

        return $search;
    }

    /**
     * The semantic half of a hybrid search: the vector of the query and how much it counts. Empty (a plain
     * keyword search) for the keyword mode, a query too short to mean anything, a user with smart features off
     * and when the query could not be embedded.
     *
     * @return array<string, mixed>
     */
    private function semantic(User $user, string $text, SearchMode $mode): array
    {
        if (
            $mode !== SearchMode::Hybrid ||
            mb_strlen($text) < config()->integer('stashlist.search.min_semantic_chars')
        ) {
            return [];
        }

        $vector = $this->queryEmbedder->embed($user, $text);

        return (
            $vector === null
                ? []
                : [
                    'vector' => $vector,
                    'hybrid' => [
                        'embedder' => config()->string('stashlist.search.embedder'),
                        'semanticRatio' => $this->ratio($text),
                    ],
                    'rankingScoreThreshold' => config()->float('stashlist.search.threshold'),
                ]
        );
    }

    /**
     * Single words are keywords, and their semantic neighbours are noise; a sentence is meaning.
     */
    private function ratio(string $text): float
    {
        $words = count(preg_split('/\s+/u', $text, flags: PREG_SPLIT_NO_EMPTY) ?: []);

        return config()->float('stashlist.search.ratio.'.match (true) {
            $words <= 1 => 'short',
            $words === 2 => 'default',
            default => 'long',
        });
    }

    /**
     * Scout writes the where() calls into the engine filter and hands it to this callback, which checks that the
     * owner filter is there and adds the one filter where() cannot say: a stash in no collection.
     */
    private function guarded(User $user, FeedFiltersData $filters): Closure
    {
        $owner = "user_id={$user->id}";
        $inNoCollection = $filters->collection === 'none';

        return static function (Indexes $index, string $text, array $options) use ($owner, $inNoCollection): array {
            $filter = (string)($options['filter'] ?? '');

            if ($filter !== $owner && ! str_starts_with($filter, "{$owner} AND ")) {
                throw new LogicException('A stash search has to be limited to its owner.');
            }

            if ($inNoCollection) {
                $options['filter'] = "{$filter} AND collection_ids IS EMPTY";
            }

            return $index->rawSearch($text, $options);
        };
    }
}
