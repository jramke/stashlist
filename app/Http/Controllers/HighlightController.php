<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Data\ToastData;
use App\Http\Requests\UpdateHighlightRequest;
use App\Models\StashHighlight;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Lang;

/**
 * Highlights from the stash page: change the note, delete. Marking a passage happens in the browser extension.
 */
final class HighlightController extends Controller
{
    public function update(UpdateHighlightRequest $request, StashHighlight $highlight): RedirectResponse
    {
        Gate::authorize('update', $highlight);

        $highlight->update($request->changes());

        ToastData::success(Lang::string('Saved.'))->flash();

        return back();
    }

    public function destroy(StashHighlight $highlight): RedirectResponse
    {
        Gate::authorize('delete', $highlight);

        $highlight->delete();

        ToastData::success(Lang::string('Highlight deleted.'))->flash();

        return back();
    }
}
