<?php

declare(strict_types=1);

namespace App\Ai;

use App\Models\Stash;
use App\Models\User;

/**
 * The only door to a provider for anything derived from a stash. A call is allowed when the instance has AI on
 * (STASHLIST_AI) and the stash's owner has smart features on (users.ai_enabled).
 *
 * The pipeline asks before it builds a job chain and again when a job runs, and the enricher asks once more
 * before it sends anything, so a future caller cannot go around the jobs. The switch only governs new work:
 * turning it off removes nothing, and turning it on again queues nothing.
 */
final class AiGuard
{
    public function allows(Stash $stash): bool
    {
        return $this->instanceHasAi() && $this->userHasAi($stash->user_id);
    }

    /**
     * @throws AiNotAllowed
     */
    public function assertAllowed(Stash $stash): void
    {
        if (! $this->instanceHasAi()) {
            throw AiNotAllowed::instanceHasAiOff();
        }

        if (! $this->userHasAi($stash->user_id)) {
            throw AiNotAllowed::userHasAiOff($stash->user_id);
        }
    }

    /**
     * Whether this instance can reach a model at all: switched on, and the chosen provider has a key (a local
     * Ollama needs none). Without a key every call would fail, so the stashes are skipped instead.
     */
    public function instanceHasAi(): bool
    {
        if (! config()->boolean('stashlist.ai.enabled')) {
            return false;
        }

        $name = Llm::configured()->provider;

        return config("ai.providers.{$name}.driver") === 'ollama' || filled(config("ai.providers.{$name}.key"));
    }

    private function userHasAi(int $userId): bool
    {
        return User::query()->whereKey($userId)->value('ai_enabled') === true;
    }
}
