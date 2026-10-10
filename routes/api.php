<?php

declare(strict_types=1);

use App\Http\Controllers\Api\MeController;
use Illuminate\Support\Facades\Route;

// The capture API of the browser extension and other clients (plan 6.3). Bearer tokens only.
Route::prefix('v1')
    ->middleware(['auth:sanctum', 'throttle:api-lookup'])
    ->group(function () {
        Route::get('me', MeController::class)->name('api.me');
    });
