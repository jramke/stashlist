<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Data\ToastData;
use App\Models\Stash;
use App\Pipeline\StartPipeline;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Lang;

final class StashReprocessController extends Controller
{
    /**
     * The retry button: runs the pipeline for this stash again.
     */
    public function store(Stash $stash, StartPipeline $pipeline): RedirectResponse
    {
        Gate::authorize('update', $stash);

        $pipeline->restart($stash);

        ToastData::info(Lang::string('Trying again.'))->flash();

        return back();
    }
}
