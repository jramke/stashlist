<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The user's tags, for autocomplete in a client's tag field.
 */
final class TagController extends Controller
{
    private const LIMIT = 50;

    public function index(Request $request): JsonResponse
    {
        $request->validate(['q' => ['nullable', 'string', 'max:100']]);
        $prefix = $request->string('q')->toString();

        $tags = Tag::query()
            ->when(
                $prefix !== '',
                static fn ($query) => $query->where(
                    'name',
                    'like',
                    addcslashes(string: $prefix, characters: '%_\\').'%',
                ),
            )
            ->orderByDesc('stashes_count')
            ->orderBy('name')
            ->limit(self::LIMIT)
            ->get();

        return response()->json([
            'data' => array_values(
                $tags->map(static fn (Tag $tag): array => [
                    'id' => $tag->id,
                    'name' => $tag->name,
                    'stashes_count' => $tag->stashes_count,
                ])->all(),
            ),
        ]);
    }
}
