<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Export;
use App\Models\User;

/**
 * The second layer behind the ownership scope, like StashPolicy.
 */
final class ExportPolicy
{
    public function view(User $user, Export $export): bool
    {
        return $export->user_id === $user->id;
    }
}
