<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\User;
use Illuminate\Foundation\DevCommands;
use Illuminate\Support\Facades\Gate;
use Laravel\Horizon\HorizonApplicationServiceProvider;

final class HorizonServiceProvider extends HorizonApplicationServiceProvider
{
    #[\Override]
    public function boot(): void
    {
        parent::boot();

        // Under `composer dev`, horizon:listen replaces the plain `horizon` process Horizon registers:
        // it restarts the workers when the code changes.
        DevCommands::artisan('horizon:listen', 'horizon');
    }

    /**
     * Outside the local environment only the admins (STASHLIST_ADMINS) may open Horizon.
     */
    #[\Override]
    protected function gate(): void
    {
        Gate::define('viewHorizon', static fn (?User $user): bool => $user?->isAdmin() === true);
    }
}
