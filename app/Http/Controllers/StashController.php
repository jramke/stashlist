<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Stashes\CaptureStash;
use App\Actions\Stashes\UpdateStash;
use App\Data\StashData;
use App\Data\StashDetailData;
use App\Data\TagData;
use App\Data\ToastData;
use App\Http\Requests\IndexStashRequest;
use App\Http\Requests\StoreStashRequest;
use App\Http\Requests\UpdateStashRequest;
use App\Images\InvalidImage;
use App\Models\Stash;
use App\Models\Tag;
use App\Models\User;
use App\Search\SimilarStashes;
use App\Stashes\Feed;
use App\Stashes\PendingDeletion;
use App\Storage\StashStorage;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Lang;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class StashController extends Controller
{
    private const PER_PAGE = 60;

    /**
     * The feed: the user's stashes, newest first, with keyset pagination (infinite scroll on the client). With a text query it lists the matches of the search engine, best first.
     */
    public function index(
        IndexStashRequest $request,
        Feed $feed,
        #[CurrentUser]
        User $user,
    ): Response {
        $filters = $request->filters();
        $mode = $request->mode();

        return Inertia::render('stashes/index', [
            // A reload of the list (polling) replaces cards by id instead of appending a second copy of each.
            'stashes' => Inertia::scroll(static fn () => $feed->page($user, $filters, self::PER_PAGE, $mode))->matchOn(
                'data.id',
            ),
            'filters' => $filters,
            // What the share sheet handed over, for the capture box.
            'share' => $request->filled('share') ? mb_substr($request->string('share')->toString(), 0, 2000) : null,
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

    public function show(
        Stash $stash,
        StashStorage $storage,
        PendingDeletion $deletion,
        SimilarStashes $similar,
    ): Response {
        Gate::authorize('view', $stash);
        abort_if($deletion->isPending($stash->id), code: 404);

        $stash->load(['enrichment', 'thumbnail', 'visibleTags', 'collections', 'highlights', 'files']);

        return Inertia::render('stashes/show', [
            'detail' => StashDetailData::fromModel($stash, $storage),
            // Found after the page is shown: the search engine is asked, which the page does not wait for.
            'similar' => Inertia::defer(static fn (): array => array_map(
                static fn (Stash $found): StashData => StashData::fromModel($found, $storage),
                $deletion
                    ->without(collect($similar->for($stash)))
                    ->values()
                    ->all(),
            )),
        ]);
    }

    /**
     * Saves what the user typed, pasted or dropped. A link that is saved already is not saved twice.
     */
    public function store(
        StoreStashRequest $request,
        CaptureStash $capture,
        #[CurrentUser]
        User $user,
    ): RedirectResponse {
        try {
            $result = $capture->capture($user, $request->payload());
        } catch (InvalidImage) {
            throw ValidationException::withMessages(['image' => Lang::string('This is not an image we can use.')]);
        }

        $toast = $result->created
            ? ToastData::success(Lang::string('Stashed.'))
            : ToastData::info(Lang::string('Already in your stashes.'));
        $toast->flash();

        return back();
    }

    public function update(UpdateStashRequest $request, Stash $stash, UpdateStash $action): RedirectResponse
    {
        Gate::authorize('update', $stash);

        $action->update($stash, $request->changes());

        ToastData::success(Lang::string('Saved.'))->flash();

        return back();
    }

    /**
     * Starts a deletion that ends for real after a short undo window.
     */
    public function destroy(Stash $stash, PendingDeletion $deletion): RedirectResponse
    {
        Gate::authorize('delete', $stash);

        $deletion->schedule($stash);

        ToastData::success(
            Lang::string('Deleted.'),
            undoUrl: route('stashes.deletion.destroy', $stash, absolute: false),
        )->flash();

        return to_route('stashes.index');
    }
}
