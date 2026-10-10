<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

/**
 * The connection test of a client: who the token belongs to, whether smart features are on and what the API
 * accepts, so a client can check sizes before it uploads.
 */
final class MeController extends Controller
{
    public function __invoke(#[CurrentUser] User $user): JsonResponse
    {
        return response()->json([
            'name' => $user->name,
            'ai_enabled' => $user->ai_enabled,
            'limits' => [
                'creates_per_minute' => config()->integer('stashlist.api.creates_per_minute'),
                'lookups_per_minute' => config()->integer('stashlist.api.lookups_per_minute'),
                'content_markdown_bytes' => config()->integer('stashlist.api.max_markdown_bytes'),
                'screenshot_bytes' => config()->integer('stashlist.api.max_screenshot_kb') * 1024,
                'image_bytes' => config()->integer('stashlist.api.max_image_kb') * 1024,
            ],
        ]);
    }
}
