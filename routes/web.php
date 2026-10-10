<?php

declare(strict_types=1);

use App\Http\Controllers\HomeController;
use App\Http\Controllers\StashController;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');

Route::middleware('auth')->group(function () {
    Route::resource('stashes', StashController::class)->only(['index', 'show']);
});

require __DIR__.'/settings.php';
