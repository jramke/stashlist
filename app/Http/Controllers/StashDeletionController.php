<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Data\ToastData;
use App\Models\Stash;
use App\Stashes\PendingDeletion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Lang;

final class StashDeletionController extends Controller
{
    /**
     * Undo: cancels a deletion that has not finished yet.
     */
    public function destroy(Stash $stash, PendingDeletion $deletion): RedirectResponse
    {
        Gate::authorize('delete', $stash);

        $deletion->cancel($stash);

        ToastData::success(Lang::string('Restored.'))->flash();

        return $this->backToFeed();
    }
}
