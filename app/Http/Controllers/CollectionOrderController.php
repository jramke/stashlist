<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\IdListRequest;
use App\Models\Collection;
use Illuminate\Http\RedirectResponse;

final class CollectionOrderController extends Controller
{
    /**
     * Saves the order of the user's collections in the sidebar: the position follows the list.
     */
    public function update(IdListRequest $request): RedirectResponse
    {
        foreach ($request->ids('ids') as $position => $id) {
            Collection::query()->whereKey($id)->update(['position' => $position]);
        }

        return back();
    }
}
