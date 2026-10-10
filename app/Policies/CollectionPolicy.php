<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Collection;
use App\Models\User;

/**
 * The second layer behind the ownership scope, like StashPolicy.
 */
final class CollectionPolicy
{
    public function update(User $user, Collection $collection): bool
    {
        return $collection->user_id === $user->id;
    }

    public function delete(User $user, Collection $collection): bool
    {
        return $collection->user_id === $user->id;
    }
}
