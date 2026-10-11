<?php

declare(strict_types=1);

use App\Http\Controllers\ConnectExtensionController;
use App\Http\Controllers\Settings\AccountController;
use App\Http\Controllers\Settings\ExportController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SmartFeaturesController;
use App\Http\Controllers\Settings\TokenController;
use App\Http\Controllers\Settings\UsageController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::patch('settings/smart-features', [SmartFeaturesController::class, 'update'])->name(
        'smart-features.update',
    );

    Route::delete('settings/account', [AccountController::class, 'destroy'])->name('account.destroy');

    Route::get('settings/usage', [UsageController::class, 'show'])->name('usage.show');

    Route::get('settings/export', [ExportController::class, 'index'])->name('exports.index');
    Route::post('settings/export', [ExportController::class, 'store'])
        ->middleware('throttle:exports')
        ->name('exports.store');
    Route::get('settings/export/{export}', [ExportController::class, 'download'])->name('exports.download');

    Route::get('settings/tokens', [TokenController::class, 'index'])->name('tokens.index');
    Route::post('settings/tokens', [TokenController::class, 'store'])->name('tokens.store');
    Route::delete('settings/tokens/{id}', [TokenController::class, 'destroy'])->name('tokens.destroy');

    // The browser extension asks for a token (see ConnectExtensionRequest for where it may be sent).
    Route::get('connect/extension', [ConnectExtensionController::class, 'show'])->name('connect.extension');
    Route::post('connect/extension', [ConnectExtensionController::class, 'store'])->name('connect.extension.store');
    Route::post('connect/extension/deny', [ConnectExtensionController::class, 'deny'])->name('connect.extension.deny');
});
