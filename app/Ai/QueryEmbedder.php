<?php

declare(strict_types=1);

namespace App\Ai;

use App\Ai\Embedding\Embedders;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * The vector of what someone typed in the search box. It only ever embeds the user's own query text, never
 * stash content, and it never fails a search: when the provider is down, slow or refusing, or the user has
 * smart features off, it answers null and the search runs on words alone.
 */
final class QueryEmbedder
{
    public function __construct(
        private readonly AiGuard $guard,
        private readonly Embedders $embedders,
    ) {}

    /**
     * @return list<float>|null
     */
    public function embed(User $user, string $query): ?array
    {
        $text = trim((string)preg_replace(pattern: '/\s+/u', replacement: ' ', subject: $query));
        $embedder = $this->embedders->forSearch();

        if ($text === '' || ! $this->guard->allowsQueryEmbedding($user, $embedder)) {
            return null;
        }

        $key = 'query-embedding:'.
        hash(
            algo: 'sha256',
            data: "{$embedder->name()}|{$embedder->model()}|{$embedder->dimensions()}|".mb_strtolower($text),
        );
        /** @var list<float> $cached */
        $cached = Cache::array($key, []);

        if ($cached !== []) {
            return $cached;
        }

        try {
            $vector = $embedder->embed([$text])->vectors[0] ?? [];
        } catch (Throwable $failure) {
            // The query is the user's own words: the log gets the kind of failure and nothing else.
            Log::warning('A search query could not be embedded; the search runs on words alone.', [
                'exception' => $failure::class,
            ]);

            return null;
        }

        if (count($vector) !== $embedder->dimensions()) {
            return null;
        }

        Cache::put($key, $vector, now()->addSeconds(config()->integer('stashlist.search.query_cache_seconds')));

        return $vector;
    }
}
