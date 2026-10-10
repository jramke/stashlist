<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\StashHighlight;
use App\Models\User;

/**
 * The second layer behind the ownership scope, as for stashes.
 */
final class StashHighlightPolicy
{
    public function view(User $user, StashHighlight $highlight): bool
    {
        return $highlight->user_id === $user->id;
    }

    public function update(User $user, StashHighlight $highlight): bool
    {
        return $highlight->user_id === $user->id;
    }

    public function delete(User $user, StashHighlight $highlight): bool
    {
        return $highlight->user_id === $user->id;
    }
}
