<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Models\Stash;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Scout\EngineManager;
use Meilisearch\Client;
use Meilisearch\Contracts\TasksQuery;
use Throwable;

/**
 * A throwaway index on a real Meilisearch, for the tests in the "meilisearch" group: what the fake engine cannot
 * tell, such as the filter syntax and the ranking. Without a server the test is skipped, unless
 * MEILISEARCH_REQUIRED is set (CI), where a missing server must fail the run.
 */
final class RealMeilisearch
{
    private string $index;

    private function __construct(
        private readonly Client $client,
    ) {
        $this->index = new Stash()->searchableAs();
    }

    /**
     * Points Scout at its own index (a random prefix) with the production settings and waits for it.
     */
    public static function start(): self
    {
        $host = (string)config('scout.meilisearch.host');

        try {
            Http::timeout(seconds: 2)->get("{$host}/health")->throw();
        } catch (Throwable $unreachable) {
            if (env('MEILISEARCH_REQUIRED')) {
                throw $unreachable;
            }

            test()->markTestSkipped("No Meilisearch at {$host}.");
        }

        config(['scout.driver' => 'meilisearch', 'scout.prefix' => 'test_'.Str::lower(Str::random(10)).'_']);

        // The engine is created on first use; make sure it is built with the settings above.
        resolve(EngineManager::class)->forgetDrivers();

        $search = new self(resolve(Client::class));
        Artisan::call('scout:sync-index-settings');
        $search->settle();

        return $search;
    }

    /**
     * Index writes are accepted at once and applied later; wait until they are all applied.
     */
    public function settle(): void
    {
        $waiting = new TasksQuery()->setIndexUids([$this->index])->setStatuses(['enqueued', 'processing']);

        for ($try = 0; $try < 200; $try++) {
            if ($this->client->getTasks($waiting)->getTotal() === 0) {
                return;
            }

            usleep(microseconds: 50_000);
        }

        throw new \RuntimeException("Meilisearch did not finish indexing {$this->index}.");
    }

    public function drop(): void
    {
        $this->client->deleteIndex($this->index);
    }
}
