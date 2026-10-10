<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Data\StashData;
use App\Data\StashDetailData;
use App\Data\TagData;
use App\Http\Requests\IndexStashRequest;
use App\Models\Stash;
use App\Models\Tag;
use App\Stashes\FeedQuery;
use App\Storage\StashStorage;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

final class StashController extends Controller
{
    private const PER_PAGE = 60;

    /**
     * The feed: the user's stashes, newest first, with keyset pagination (infinite scroll on the client).
     */
    public function index(IndexStashRequest $request, FeedQuery $feed, StashStorage $storage): Response
    {
        $filters = $request->filters();

        return Inertia::render('stashes/index', [
            'stashes' => Inertia::scroll(
                static fn () => $feed
                    ->build($filters)
                    ->cursorPaginate(self::PER_PAGE)
                    ->through(static fn (Stash $stash): StashData => StashData::fromModel($stash, $storage)),
            ),
            'filters' => $filters,
            'tags' => array_values(
                Tag::query()
                    ->orderByDesc('stashes_count')
                    ->orderBy('name')
                    ->limit(50)
                    ->get()
                    ->map(TagData::fromModel(...))
                    ->all(),
            ),
        ]);
    }

    public function show(Stash $stash, StashStorage $storage): Response
    {
        Gate::authorize('view', $stash);

        $stash->load(['enrichment', 'thumbnail', 'visibleTags', 'collections', 'files']);

        return Inertia::render('stashes/show', [
            'detail' => StashDetailData::fromModel($stash, $storage),
        ]);
    }
}
