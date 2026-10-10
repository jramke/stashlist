<?php

declare(strict_types=1);

use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SmartFeaturesController;
use App\Http\Controllers\Settings\TokenController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::patch('settings/smart-features', [SmartFeaturesController::class, 'update'])->name(
        'smart-features.update',
    );

    Route::get('settings/tokens', [TokenController::class, 'index'])->name('tokens.index');
    Route::post('settings/tokens', [TokenController::class, 'store'])->name('tokens.store');
    Route::delete('settings/tokens/{id}', [TokenController::class, 'destroy'])->name('tokens.destroy');
});
