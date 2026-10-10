<?php

declare(strict_types=1);

namespace App\Stashes;

use App\Data\FeedFiltersData;
use App\Data\StashData;
use App\Data\ToastData;
use App\Enums\SearchMode;
use App\Models\Stash;
use App\Models\User;
use App\Search\SearchUnavailable;
use App\Search\StashSearch;
use App\Storage\StashStorage;
use Illuminate\Pagination\AbstractCursorPaginator;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Lang;

/**
 * One page of cards for the feed: the user's stashes newest first, or the matches of a text search, best
 * first. A stash that was just deleted is gone for the user even while its undo window is still open.
 */
final readonly class Feed
{
    public function __construct(
        private FeedQuery $query,
        private StashSearch $search,
        private PendingDeletion $deletion,
        private StashStorage $storage,
    ) {}

    /**
     * @return AbstractCursorPaginator<int, Stash>|AbstractPaginator<int, Stash> its items are StashData already
     */
    public function page(
        User $user,
        FeedFiltersData $filters,
        int $perPage,
        SearchMode $mode = SearchMode::Hybrid,
    ): AbstractCursorPaginator|AbstractPaginator {
        try {
            $page = $filters->q === null
                ? $this->query->build($filters)->cursorPaginate($perPage)
                : $this->search->search($user, $filters->q, $filters, $perPage, $mode);
        } catch (SearchUnavailable) {
            // The feed itself works without the search engine; only the search does not.
            ToastData::error(Lang::string('Search is not available right now. Try again in a moment.'))->flash();

            $page = new LengthAwarePaginator([], total: 0, perPage: $perPage);
        }

        $page->setCollection($this->deletion->without($page->getCollection()));

        return $page->through(fn (Stash $stash): StashData => StashData::fromModel($stash, $this->storage));
    }
}
