<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Collections\CollectionSync;
use App\Http\Requests\IdListRequest;
use App\Models\Stash;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;

final class StashCollectionController extends Controller
{
    /**
     * The "add to a collection" picker: the stash ends up in exactly these collections.
     */
    public function update(IdListRequest $request, Stash $stash, CollectionSync $sync): RedirectResponse
    {
        Gate::authorize('update', $stash);

        $sync->syncCollections($stash, $request->ids('collection_ids'));

        return back();
    }
}
