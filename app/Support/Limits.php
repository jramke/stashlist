<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Stash;
use App\Models\StashFile;
use App\Models\UsageMonthly;
use App\Models\User;

/**
 * What a user's plan allows (config('stashlist.plans')). Fair-use caps, not an upsell: a stash over the AI cap
 * is saved as usual and its smart features wait for the next month, while the cap on stashes and storage stops
 * a save.
 */
final class Limits
{
    public function planOf(int $userId): Plan
    {
        $forced = config()->string('stashlist.plan');
        $name = $forced !== '' ? $forced : (string)User::query()->whereKey($userId)->value('plan');

        if (! array_key_exists($name, config()->array('stashlist.plans'))) {
            $name = 'free';
        }

        $megabytes = self::cap($name, 'storage_megabytes');

        return new Plan(
            name: $name,
            stashes: self::cap($name, 'stashes'),
            storageBytes: $megabytes === null ? null : $megabytes * 1024 * 1024,
            aiStashesPerMonth: self::cap($name, 'ai_stashes_per_month'),
            searchesPerMinute: self::cap($name, 'searches_per_minute') ?? 60,
        );
    }

    private static function cap(string $plan, string $key): ?int
    {
        $caps = config()->array("stashlist.plans.{$plan}");

        return array_key_exists($key, $caps) && is_int($caps[$key]) ? $caps[$key] : null;
    }

    public function mayEnrich(int $userId): bool
    {
        $cap = $this->planOf($userId)->aiStashesPerMonth;

        return $cap === null || $this->aiStashesThisMonth($userId) < $cap;
    }

    /**
     * @throws StashLimitReached when the plan's cap on stashes is reached
     */
    public function assertMayAddStash(int $userId): void
    {
        $cap = $this->planOf($userId)->stashes;

        if ($cap !== null && $this->stashCount($userId) >= $cap) {
            throw StashLimitReached::stashes($cap);
        }
    }

    /**
     * @throws StashLimitReached when the bytes would not fit in the plan's storage
     */
    public function assertMayStore(int $userId, int $bytes): void
    {
        $cap = $this->planOf($userId)->storageBytes;

        if ($cap !== null && ($this->storageBytes($userId) + $bytes) > $cap) {
            throw StashLimitReached::storage();
        }
    }

    public function usage(int $userId): Usage
    {
        $plan = $this->planOf($userId);

        return new Usage(
            plan: $plan->name,
            stashes: $this->stashCount($userId),
            stashes_cap: $plan->stashes,
            storage_bytes: $this->storageBytes($userId),
            storage_cap_bytes: $plan->storageBytes,
            ai_stashes: $this->aiStashesThisMonth($userId),
            ai_stashes_cap: $plan->aiStashesPerMonth,
            period: now()->format('Y-m'),
        );
    }

    private function stashCount(int $userId): int
    {
        return Stash::query()->withoutGlobalScopes()->where('user_id', $userId)->count();
    }

    private function storageBytes(int $userId): int
    {
        return (int)StashFile::query()->withoutGlobalScopes()->where('user_id', $userId)->sum('bytes');
    }

    private function aiStashesThisMonth(int $userId): int
    {
        return (int)UsageMonthly::query()
            ->where('user_id', $userId)
            ->where('period', now()->format('Y-m'))
            ->value('llm_stashes');
    }
}
