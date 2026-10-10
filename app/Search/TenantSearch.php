<?php

declare(strict_types=1);

namespace App\Search;

use App\Models\Stash;
use Meilisearch\Client;
use Meilisearch\Endpoints\Indexes;

/**
 * Searches with a tenant token when the instance has a search key (MEILISEARCH_SEARCH_KEY and its uid, made
 * with `stashlist:search-key`). A tenant token carries the rule "user_id = N" inside itself, signed with the
 * search key, so the engine enforces the owner filter even if the application forgot to add it: the second wall
 * behind the filter every search already has. Without a key searches run with the application's own key, as
 * before.
 *
 * The token lasts an hour and is made for one user; making it is one HMAC.
 */
final class TenantSearch
{
    private const MINUTES = 60;

    public function __construct(
        private readonly Client $admin,
    ) {}

    public function enabled(): bool
    {
        return (
            config()->string('stashlist.search.tenant.key') !== '' &&
            config()->string('stashlist.search.tenant.uid') !== ''
        );
    }

    /**
     * The user's part of the stash index, reached with a token that cannot see anyone else's documents; null
     * when tenant tokens are not set up.
     */
    public function indexFor(int $userId): ?Indexes
    {
        if (! $this->enabled()) {
            return null;
        }

        $uid = new Stash()->searchableAs();
        $token = $this->admin->generateTenantToken(
            config()->string('stashlist.search.tenant.uid'),
            [$uid => ['filter' => "user_id = {$userId}"]],
            [
                'apiKey' => config()->string('stashlist.search.tenant.key'),
                'expiresAt' => now()->addMinutes(self::MINUTES),
            ],
        );

        return new Client(config()->string('scout.meilisearch.host'), $token)->index($uid);
    }
}
