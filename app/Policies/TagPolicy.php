<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Tag;
use App\Models\User;

/**
 * The second layer behind the ownership scope, like StashPolicy.
 */
final class TagPolicy
{
    public function update(User $user, Tag $tag): bool
    {
        return $tag->user_id === $user->id;
    }

    public function delete(User $user, Tag $tag): bool
    {
        return $tag->user_id === $user->id;
    }
}
