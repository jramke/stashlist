<?php

declare(strict_types=1);

use App\Http\Controllers\Api\CollectionController;
use App\Http\Controllers\Api\HighlightController;
use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\StashController;
use App\Http\Controllers\Api\TagController;
use Illuminate\Support\Facades\Route;

// The capture API of the browser extension and other clients (plan 6.3). Bearer tokens only; every route
// asks for an ability the token was made with, and every limit is per token.
Route::prefix('v1')
    ->middleware(['auth:sanctum', 'not.closing'])
    ->group(function () {
        Route::get('me', MeController::class)->middleware('throttle:api-lookup')->name('api.me');

        Route::post('stashes', [StashController::class, 'store'])
            ->middleware(['abilities:stash:create', 'throttle:api-create', 'json.limit', 'idempotent'])
            ->name('api.stashes.store');

        Route::middleware(['abilities:stash:read', 'throttle:api-lookup'])->group(function () {
            Route::get('stashes/lookup', [StashController::class, 'lookup'])->name('api.stashes.lookup');
            Route::get('tags', [TagController::class, 'index'])->name('api.tags.index');
            Route::get('collections', [CollectionController::class, 'index'])->name('api.collections.index');

            Route::get('highlights/index', [HighlightController::class, 'index'])->name('api.highlights.index');
            Route::get('highlights', [HighlightController::class, 'show'])->name('api.highlights.show');
        });

        Route::get('stashes', [StashController::class, 'index'])
            ->middleware(['abilities:stash:search', 'throttle:api-lookup'])
            ->name('api.stashes.index');

        // Marking passages. Creating one on an address can create the page's stash, which needs that ability too.
        Route::middleware(['abilities:highlight:manage', 'throttle:api-create', 'json.limit'])->group(function () {
            Route::post('stashes/{stash}/highlights', [HighlightController::class, 'storeForStash'])
                ->whereNumber('stash')
                ->name('api.highlights.store-for-stash');
            Route::post('highlights', [HighlightController::class, 'storeForUrl'])
                ->middleware('abilities:stash:create')
                ->name('api.highlights.store');
            Route::patch('highlights/{highlight}', [HighlightController::class, 'update'])
                ->whereNumber('highlight')
                ->name('api.highlights.update');
            Route::delete('highlights/{highlight}', [HighlightController::class, 'destroy'])
                ->whereNumber('highlight')
                ->name('api.highlights.destroy');
        });
    });
