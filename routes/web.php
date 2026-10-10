<?php

declare(strict_types=1);

use App\Http\Controllers\CollectionController;
use App\Http\Controllers\CollectionOrderController;
use App\Http\Controllers\CollectionStashController;
use App\Http\Controllers\HighlightController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\SocialLoginController;
use App\Http\Controllers\StashCollectionController;
use App\Http\Controllers\StashController;
use App\Http\Controllers\StashDeletionController;
use App\Http\Controllers\StashReprocessController;
use App\Http\Controllers\StashTagController;
use App\Http\Controllers\TagController;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');

// Sign in with GitHub or Google. The paths are the ones the old app's OAuth apps already allow.
Route::middleware('guest')->group(function () {
    Route::get('login/{provider}', [SocialLoginController::class, 'redirect'])->name('login.provider');
    Route::get('login/{provider}/callback', [SocialLoginController::class, 'callback'])->name(
        'login.provider.callback',
    );
});

Route::middleware('auth')->group(function () {
    Route::post('stashes', [StashController::class, 'store'])->middleware('throttle:capture')->name('stashes.store');
    Route::get('stashes', [StashController::class, 'index'])->middleware('throttle:search')->name('stashes.index');
    Route::resource('stashes', StashController::class)->only(['show', 'update', 'destroy']);

    Route::delete('stashes/{stash}/deletion', [StashDeletionController::class, 'destroy'])->name(
        'stashes.deletion.destroy',
    );
    Route::post('stashes/{stash}/reprocess', [StashReprocessController::class, 'store'])
        ->middleware('throttle:reprocess')
        ->name('stashes.reprocess');
    Route::post('stashes/{stash}/tags', [StashTagController::class, 'store'])->name('stashes.tags.store');
    Route::delete('stashes/{stash}/tags/{tag}', [StashTagController::class, 'destroy'])->name('stashes.tags.destroy');
    Route::put('stashes/{stash}/collections', [StashCollectionController::class, 'update'])->name(
        'stashes.collections.update',
    );

    Route::patch('highlights/{highlight}', [HighlightController::class, 'update'])->name('highlights.update');
    Route::delete('highlights/{highlight}', [HighlightController::class, 'destroy'])->name('highlights.destroy');

    Route::put('collections/order', [CollectionOrderController::class, 'update'])->name('collections.order');
    Route::resource('collections', CollectionController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::put('collections/{collection}/stashes', [CollectionStashController::class, 'update'])->name(
        'collections.stashes.update',
    );

    Route::get('tags', [TagController::class, 'index'])->name('tags.index');
    Route::patch('tags/{tag}', [TagController::class, 'update'])->name('tags.update');
    Route::delete('tags/{tag}', [TagController::class, 'destroy'])->name('tags.destroy');
});

require __DIR__.'/settings.php';
