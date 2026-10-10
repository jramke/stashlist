<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Collections\CollectionSync;
use App\Data\ToastData;
use App\Http\Requests\StoreCollectionRequest;
use App\Http\Requests\UpdateCollectionRequest;
use App\Models\Collection;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Lang;
use Inertia\Inertia;
use Inertia\Response;

final class CollectionController extends Controller
{
    /**
     * The management page. The collections themselves come with the shared props.
     */
    public function index(): Response
    {
        return Inertia::render('collections/index');
    }

    public function store(StoreCollectionRequest $request, #[CurrentUser] User $user): RedirectResponse
    {
        $collection = new Collection([
            'name' => $request->string('name')->toString(),
            'description' => $request->filled('description') ? $request->string('description')->toString() : null,
            'position' => (int)Collection::query()->where('user_id', $user->id)->max('position') + 1,
        ]);
        $collection->user_id = $user->id;
        $collection->save();

        ToastData::success(Lang::string('Collection created.'))->flash();

        return back();
    }

    public function update(UpdateCollectionRequest $request, Collection $collection): RedirectResponse
    {
        Gate::authorize('update', $collection);

        $collection->update($request->changes());

        ToastData::success(Lang::string('Saved.'))->flash();

        return back();
    }

    /**
     * The stashes stay; only the collection and its links go.
     */
    public function destroy(Collection $collection, CollectionSync $sync): RedirectResponse
    {
        Gate::authorize('delete', $collection);

        $sync->delete($collection);

        ToastData::success(Lang::string('Collection deleted.'))->flash();

        return to_route('collections.index');
    }
}
