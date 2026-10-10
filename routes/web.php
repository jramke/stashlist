<?php

declare(strict_types=1);

use App\Http\Controllers\HomeController;
use App\Http\Controllers\StashController;
use App\Http\Controllers\StashDeletionController;
use App\Http\Controllers\StashReprocessController;
use App\Http\Controllers\StashTagController;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');

Route::middleware('auth')->group(function () {
    Route::post('stashes', [StashController::class, 'store'])->middleware('throttle:capture')->name('stashes.store');
    Route::resource('stashes', StashController::class)->only(['index', 'show', 'update', 'destroy']);

    Route::delete('stashes/{stash}/deletion', [StashDeletionController::class, 'destroy'])->name(
        'stashes.deletion.destroy',
    );
    Route::post('stashes/{stash}/reprocess', [StashReprocessController::class, 'store'])
        ->middleware('throttle:reprocess')
        ->name('stashes.reprocess');
    Route::post('stashes/{stash}/tags', [StashTagController::class, 'store'])->name('stashes.tags.store');
    Route::delete('stashes/{stash}/tags/{tag}', [StashTagController::class, 'destroy'])->name('stashes.tags.destroy');
});

require __DIR__.'/settings.php';
