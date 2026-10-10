<?php

declare(strict_types=1);

namespace App\Ai;

use App\Ai\Embedding\Embedder;
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

        return $this->providerIsConfigured(Llm::configured()->provider);
    }

    /**
     * Whether this instance can make vectors with the embedder: switched on, and its provider has a key.
     */
    public function canEmbed(Embedder $embedder): bool
    {
        return config()->boolean('stashlist.ai.enabled') && $this->providerIsConfigured($embedder->provider());
    }

    /**
     * Whether a search by this user may embed the query: the same two switches as for a stash, and a key. With
     * smart features off the search is on words alone, so no provider is called at all.
     */
    public function allowsQueryEmbedding(User $user, Embedder $embedder): bool
    {
        return $user->ai_enabled && $this->canEmbed($embedder);
    }

    private function providerIsConfigured(string $provider): bool
    {
        return (
            $provider === 'fake' ||
            config("ai.providers.{$provider}.driver") === 'ollama' ||
            filled(config("ai.providers.{$provider}.key"))
        );
    }

    private function userHasAi(int $userId): bool
    {
        return User::query()->whereKey($userId)->value('ai_enabled') === true;
    }
}
