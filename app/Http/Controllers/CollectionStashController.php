<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Collections\CollectionSync;
use App\Http\Requests\IdListRequest;
use App\Models\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;

final class CollectionStashController extends Controller
{
    /**
     * Sets which stashes are in the collection and in what order. Ids that are not the user's are ignored.
     */
    public function update(IdListRequest $request, Collection $collection, CollectionSync $sync): RedirectResponse
    {
        Gate::authorize('update', $collection);

        $sync->syncStashes($collection, $request->ids('stash_ids'));

        return back();
    }
}
