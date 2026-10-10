<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use Illuminate\Http\JsonResponse;

/**
 * The user's collections, for the picker of a client.
 */
final class CollectionController extends Controller
{
    public function index(): JsonResponse
    {
        $collections = Collection::query()->withCount('stashes')->orderBy('position')->orderBy('name')->get();

        return response()->json([
            'data' => array_values(
                $collections->map(static fn (Collection $collection): array => [
                    'id' => $collection->id,
                    'name' => $collection->name,
                    'stashes_count' => $collection->stashes_count,
                ])->all(),
            ),
        ]);
    }
}
