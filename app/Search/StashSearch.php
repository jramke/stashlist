<?php

declare(strict_types=1);

namespace App\Search;

use App\Data\FeedFiltersData;
use App\Models\Stash;
use App\Models\User;
use App\Stashes\FeedQuery;
use Closure;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Pagination\LengthAwarePaginator;
use Laravel\Scout\Builder;
use LogicException;
use Meilisearch\Endpoints\Indexes;

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
    /**
     * One page of the stashes that match the text, best match first.
     *
     * @return LengthAwarePaginator<int, Stash>
     */
    public function search(User $user, string $text, FeedFiltersData $filters, int $perPage): LengthAwarePaginator
    {
        /** @var LengthAwarePaginator<int, Stash> */
        return $this
            ->builder($user, $text, $filters)
            ->query(static fn (EloquentBuilder $stashes): EloquentBuilder => $stashes->with(FeedQuery::EAGER))
            ->paginate($perPage);
    }

    /**
     * The engine query before it runs. Public for the tests that check what it asks for.
     *
     * @return Builder<Stash>
     */
    public function builder(User $user, string $text, FeedFiltersData $filters): Builder
    {
        // The owner comes first and from the User object. Nothing below may replace it.
        $search = Stash::search(trim($text), $this->guarded($user, $filters))->where(
            'user_id',
            $user->id,
        );

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
