<?php

declare(strict_types=1);

use App\Http\Controllers\CollectionController;
use App\Http\Controllers\CollectionOrderController;
use App\Http\Controllers\CollectionStashController;
use App\Http\Controllers\HighlightController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MarketingController;
use App\Http\Controllers\PlaygroundController;
use App\Http\Controllers\PrivacyController;
use App\Http\Controllers\SearchEngineFilesController;
use App\Http\Controllers\ShareController;
use App\Http\Controllers\ShortcutsController;
use App\Http\Controllers\SocialLoginController;
use App\Http\Controllers\StashCollectionController;
use App\Http\Controllers\StashController;
use App\Http\Controllers\StashDeletionController;
use App\Http\Controllers\StashReprocessController;
use App\Http\Controllers\StashTagController;
use App\Http\Controllers\TagController;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');
Route::get('privacy', PrivacyController::class)->name('privacy');
Route::get('pricing', [MarketingController::class, 'pricing'])->name('pricing');
Route::get('extension', [MarketingController::class, 'extension'])->name('extension');
Route::get('docs', [MarketingController::class, 'docs'])->name('docs');
Route::get('terms', [MarketingController::class, 'terms'])->name('terms');
Route::get('imprint', [MarketingController::class, 'imprint'])->name('imprint');
Route::get('changelog', [MarketingController::class, 'changelog'])->name('changelog');
Route::get('mymind-alternative', [MarketingController::class, 'compare'])->name('compare');
Route::get('sitemap.xml', [SearchEngineFilesController::class, 'sitemap'])->name('sitemap');
Route::get('robots.txt', [SearchEngineFilesController::class, 'robots'])->name('robots');

// Sign in with GitHub or Google. The paths are the ones the old app's OAuth apps already allow.
Route::middleware('guest')->group(function () {
    Route::get('login/{provider}', [SocialLoginController::class, 'redirect'])->name('login.provider');
    Route::get('login/{provider}/callback', [SocialLoginController::class, 'callback'])->name(
        'login.provider.callback',
    );
});

Route::middleware('auth')->group(function () {
    Route::get('share', ShareController::class)->name('share');
    Route::get('shortcuts', ShortcutsController::class)->name('shortcuts');
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

    // For building the interface; they answer 404 unless config `stashlist.playground` is on.
    Route::get('playground/cards', [PlaygroundController::class, 'cards'])->name('playground.cards');
    Route::get('playground/art', [PlaygroundController::class, 'art'])->name('playground.art');

    Route::get('tags', [TagController::class, 'index'])->name('tags.index');
    Route::patch('tags/{tag}', [TagController::class, 'update'])->name('tags.update');
    Route::post('tags/{tag}/merge', [TagController::class, 'merge'])->name('tags.merge');
    Route::delete('tags/{tag}', [TagController::class, 'destroy'])->name('tags.destroy');
});

require __DIR__.'/settings.php';
