<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreStashTagRequest;
use App\Models\Stash;
use App\Models\Tag;
use App\Tags\TagSync;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;

final class StashTagController extends Controller
{
    public function store(StoreStashTagRequest $request, Stash $stash, TagSync $tags): RedirectResponse
    {
        Gate::authorize('update', $stash);

        $tags->addByUser($stash, $request->name());

        return back();
    }

    public function destroy(Stash $stash, Tag $tag, TagSync $tags): RedirectResponse
    {
        Gate::authorize('update', $stash);

        $tags->removeByUser($stash, $tag);

        return back();
    }
}
