<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Data\TagData;
use App\Data\ToastData;
use App\Http\Requests\UpdateTagRequest;
use App\Models\Tag;
use App\Tags\TagNameTaken;
use App\Tags\TagSync;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Lang;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class TagController extends Controller
{
    /**
     * All of the user's tags, the most used first.
     */
    public function index(): Response
    {
        return Inertia::render('tags/index', [
            'tags' => array_values(
                Tag::query()
                    ->orderByDesc('stashes_count')
                    ->orderBy('name')
                    ->get()
                    ->map(TagData::fromModel(...))
                    ->all(),
            ),
        ]);
    }

    public function update(UpdateTagRequest $request, Tag $tag, TagSync $tags): RedirectResponse
    {
        Gate::authorize('update', $tag);

        try {
            $tags->rename($tag, $request->name());
        } catch (TagNameTaken $taken) {
            throw ValidationException::withMessages(['name' => $taken->getMessage()]);
        }

        ToastData::success(Lang::string('Saved.'))->flash();

        return back();
    }

    public function destroy(Tag $tag, TagSync $tags): RedirectResponse
    {
        Gate::authorize('delete', $tag);

        $tags->delete($tag);

        ToastData::success(Lang::string('Tag deleted.'))->flash();

        return back();
    }
}
