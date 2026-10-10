<?php

declare(strict_types=1);

use App\Http\Controllers\Api\CollectionController;
use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\StashController;
use App\Http\Controllers\Api\TagController;
use Illuminate\Support\Facades\Route;

// The capture API of the browser extension and other clients (plan 6.3). Bearer tokens only; every route
// asks for an ability the token was made with, and every limit is per token.
Route::prefix('v1')
    ->middleware('auth:sanctum')
    ->group(function () {
        Route::get('me', MeController::class)->middleware('throttle:api-lookup')->name('api.me');

        Route::post('stashes', [StashController::class, 'store'])
            ->middleware(['abilities:stash:create', 'throttle:api-create', 'json.limit', 'idempotent'])
            ->name('api.stashes.store');

        Route::middleware(['abilities:stash:read', 'throttle:api-lookup'])->group(function () {
            Route::get('stashes/lookup', [StashController::class, 'lookup'])->name('api.stashes.lookup');
            Route::get('tags', [TagController::class, 'index'])->name('api.tags.index');
            Route::get('collections', [CollectionController::class, 'index'])->name('api.collections.index');
        });
    });
