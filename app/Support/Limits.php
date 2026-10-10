<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\UsageMonthly;
use App\Models\User;

/**
 * What a user's plan allows (config('stashlist.plans')). Fair-use caps, not an upsell: a stash over the AI cap
 * is saved as usual and its smart features wait for the next month.
 */
final class Limits
{
    public function mayEnrich(int $userId): bool
    {
        $plan = (string)User::query()->whereKey($userId)->value('plan');
        $cap = config()->integer(
            "stashlist.plans.{$plan}.ai_stashes_per_month",
            config()->integer('stashlist.plans.free.ai_stashes_per_month'),
        );

        return (
            (int)UsageMonthly::query()
                ->where('user_id', $userId)
                ->where('period', now()->format('Y-m'))
                ->value('llm_stashes') < $cap
        );
    }
}
