<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Stash;
use App\Models\User;

/**
 * The second layer behind the ownership scope: the scope hides other users' stashes (404), the policy refuses
 * them again if a code path ever loads one without the scope.
 */
final class StashPolicy
{
    public function view(User $user, Stash $stash): bool
    {
        return $stash->user_id === $user->id;
    }

    public function update(User $user, Stash $stash): bool
    {
        return $stash->user_id === $user->id;
    }

    public function delete(User $user, Stash $stash): bool
    {
        return $stash->user_id === $user->id;
    }
}
