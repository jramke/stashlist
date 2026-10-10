<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Stashes\CaptureStash;
use App\Data\Api\StashApiData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreStashRequest;
use App\Images\InvalidImage;
use App\Models\Stash;
use App\Models\Tag;
use App\Models\User;
use App\Support\UrlNormalizer;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

/**
 * Saving and finding stashes for clients with a token (plan 6.3).
 */
final class StashController extends Controller
{
    /**
     * Saves what the client sends: 201 for a new stash, 200 with the existing one for a link saved before.
     */
    public function store(StoreStashRequest $request, CaptureStash $capture, #[CurrentUser] User $user): JsonResponse
    {
        try {
            $result = $capture->capture($user, $request->payload());
        } catch (InvalidImage $invalid) {
            throw ValidationException::withMessages(['image' => $invalid->getMessage()]);
        } catch (InvalidArgumentException) {
            throw ValidationException::withMessages(['url' => 'There is nothing to save.']);
        }

        $result->stash->load(['enrichment', 'visibleTags']);

        return response()->json(
            StashApiData::fromModel($result->stash, $result->created),
            $result->created ? 201 : 200,
        );
    }

    /**
     * Whether a link is saved already: the "already saved" state of the extension's popup.
     */
    public function lookup(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $request->validate(['url' => ['required', 'string', 'max:2048']]);
        $normalized = UrlNormalizer::normalize($request->string('url')->toString());

        $stash = $normalized === null
            ? null
            : Stash::query()
                ->where('user_id', $user->id)
                ->where('url_hash', UrlNormalizer::hash($normalized))
                ->with(['enrichment', 'visibleTags'])
                ->first();

        return response()->json([
            'saved' => $stash !== null,
            'id' => $stash?->id,
            'title' => $stash?->displayTitle(),
            'tags' => $stash === null
                ? []
                : array_values($stash->visibleTags->map(static fn (Tag $tag): string => $tag->name)->all()),
        ]);
    }
}
