<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Stashes\CapturePayload;
use App\Actions\Stashes\CaptureStash;
use App\Data\Api\HighlightApiData;
use App\Highlights\AddHighlight;
use App\Highlights\HighlightLimitReached;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreHighlightRequest;
use App\Http\Requests\Api\StoreUrlHighlightRequest;
use App\Http\Requests\UpdateHighlightRequest;
use App\Models\Stash;
use App\Models\StashHighlight;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

/**
 * Highlights for the extension (plan 6.3): create on a stash or on an address, a cheap list of ids and
 * revisions to sync from, the highlights by id, edit and delete.
 */
final class HighlightController extends Controller
{
    private const MAX_IDS = 200;

    /**
     * Marks a passage on a stash the user has.
     */
    public function storeForStash(StoreHighlightRequest $request, int $stash, AddHighlight $add): JsonResponse
    {
        $found = Stash::query()->findOrFail($stash);
        Gate::authorize('update', $found);

        return $this->respond($found, $request, $add);
    }

    /**
     * Marks a passage on a page by its address. The page's stash is made first when the user does not have it.
     */
    public function storeForUrl(
        StoreUrlHighlightRequest $request,
        AddHighlight $add,
        CaptureStash $capture,
        #[CurrentUser]
        User $user,
    ): JsonResponse {
        $stash = $capture->capture(
            $user,
            new CapturePayload(input: $request->address(), title: $request->pageTitle()),
        )->stash;

        return $this->respond($stash, $request, $add);
    }

    /**
     * Every highlight of the user as {id, v}, v being the revision. With an ETag a client asks "anything new?"
     * and gets 304. A highlight that is no longer in the list was deleted.
     */
    public function index(Request $request): JsonResponse
    {
        $list = StashHighlight::query()
            ->orderBy('id')
            ->get(['id', 'revision'])
            ->map(static fn (StashHighlight $highlight): array => ['id' => $highlight->id, 'v' => $highlight->revision])
            ->values()
            ->all();

        $response = response()->json($list);
        $response->setEtag(md5((string)json_encode($list)));
        $response->isNotModified($request);

        return $response;
    }

    /**
     * The highlights with these ids (comma separated), each with the hash of its page.
     */
    public function show(Request $request): JsonResponse
    {
        $request->validate(['ids' => ['required', 'string', 'max:2000']]);

        $ids = array_values(array_unique(array_filter(
            array_map(intval(...), explode(',', $request->string('ids')->toString())),
            static fn (int $id): bool => $id > 0,
        )));

        if (count($ids) > self::MAX_IDS) {
            throw ValidationException::withMessages([
                'ids' => 'Ask for at most '.self::MAX_IDS.' highlights at a time.',
            ]);
        }

        $highlights = StashHighlight::query()
            ->whereIn('id', $ids)
            ->with('stash:id,user_id,url_hash')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => array_values($highlights->map(HighlightApiData::fromModel(...))->all()),
        ]);
    }

    public function update(UpdateHighlightRequest $request, int $highlight): JsonResponse
    {
        $found = StashHighlight::query()->with('stash:id,user_id,url_hash')->findOrFail($highlight);
        Gate::authorize('update', $found);

        $found->update($request->changes());

        return response()->json(HighlightApiData::fromModel($found->refresh()->load('stash:id,user_id,url_hash')));
    }

    public function destroy(int $highlight): Response
    {
        $found = StashHighlight::query()->findOrFail($highlight);
        Gate::authorize('delete', $found);

        $found->delete();

        return response()->noContent();
    }

    private function respond(Stash $stash, StoreHighlightRequest $request, AddHighlight $add): JsonResponse
    {
        try {
            [$highlight, $created] = $add->add($stash, $request->highlight());
        } catch (HighlightLimitReached $limit) {
            throw ValidationException::withMessages(['text' => $limit->getMessage()]);
        }

        $highlight->load('stash:id,user_id,url_hash');

        return response()->json(HighlightApiData::fromModel($highlight), $created ? 201 : 200);
    }
}
