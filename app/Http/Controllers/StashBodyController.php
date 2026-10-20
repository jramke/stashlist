<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Stash;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

final class StashBodyController extends Controller
{
    /**
     * The whole text of a stash, for "Copy": the feed only carries the start of a long note (`StashData::$body_cut`).
     */
    public function __invoke(Stash $stash): JsonResponse
    {
        Gate::authorize('view', $stash);

        return response()->json(['body' => $stash->body]);
    }
}
