<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Search\Spike\SyntheticDocuments;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use Meilisearch\Client;
use Meilisearch\Contracts\SimilarDocumentsQuery;
use Meilisearch\Contracts\TasksQuery;
use Meilisearch\Endpoints\Indexes;
use Meilisearch\Exceptions\ExceptionInterface;

#[Signature('stashlist:search-spike
    {--docs=100000 : How many synthetic documents}
    {--users=200 : How many owners they are shared among}
    {--dimensions=512 : Size of the vectors}
    {--queries=200 : How many filtered hybrid searches and how many similar-documents requests to time}
    {--keep : Keep the throwaway index afterwards}')]
#[Description(
    'Measure the search engine on synthetic documents with vectors: indexing time, filtered hybrid search, similar documents',
)]
final class SearchSpike extends Command
{
    private const BATCH = 1000;

    public function handle(Client $engine): int
    {
        $docs = max(1, $this->number('docs'));
        $users = max(1, $this->number('users'));
        $dimensions = max(2, $this->number('dimensions'));
        $queries = max(1, $this->number('queries'));
        $uid = 'spike_'.Str::lower(Str::random(8));

        try {
            $index = $this->prepare($engine, $uid, $dimensions);
            $synthetic = new SyntheticDocuments($users, $dimensions);
            $loaded = $this->load($engine, $index, $docs, $synthetic);

            $this->components->info(sprintf(
                'Indexed %d documents in %.1f s (%.0f documents/s).',
                $docs,
                $loaded,
                $docs / max(0.001, $loaded),
            ));
            $this->components->twoColumnDetail(
                'Hybrid, filtered by owner',
                $this->percentiles($this->timeSearches($index, $queries, $synthetic)),
            );
            $this->components->twoColumnDetail(
                'Similar documents',
                $this->percentiles($this->timeSimilar($index, $queries, $docs, $users)),
            );

            $this->components->twoColumnDetail('Index size on disk', $this->size($index));
            $this->components->info(
                'Memory is the engine process: check it now (docker stats) before this command removes the index.',
            );
        } catch (ExceptionInterface $failure) {
            $this->components->error('The search engine failed: '.$failure->getMessage());

            return self::FAILURE;
        } finally {
            if (! $this->option('keep')) {
                $engine->deleteIndex($uid);
            }
        }

        return self::SUCCESS;
    }

    private function prepare(Client $engine, string $uid, int $dimensions): Indexes
    {
        $engine->createIndex($uid, ['primaryKey' => 'id']);
        $index = $engine->index($uid);
        $index->updateSettings([
            'searchableAttributes' => ['title', 'body'],
            'filterableAttributes' => ['user_id'],
            'displayedAttributes' => ['id'],
            'proximityPrecision' => 'byAttribute',
            'embedders' => ['text_v1' => ['source' => 'userProvided', 'dimensions' => $dimensions]],
        ]);
        $this->settle($engine, $uid);

        return $index;
    }

    /**
     * @return float seconds until every document was applied
     */
    private function load(Client $engine, Indexes $index, int $docs, SyntheticDocuments $synthetic): float
    {
        $started = hrtime(as_number: true);
        $bar = $this->output->createProgressBar((int)ceil($docs / self::BATCH));

        for ($from = 1; $from <= $docs; $from += self::BATCH) {
            $batch = [];

            for ($id = $from; $id < min($from + self::BATCH, $docs + 1); $id++) {
                $batch[] = $synthetic->document($id);
            }

            $index->addDocuments($batch, 'id');
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->settle($engine, (string)$index->getUid());

        return (hrtime(as_number: true) - $started) / 1_000_000_000;
    }

    /**
     * @return list<float> milliseconds
     */
    private function timeSearches(Indexes $index, int $queries, SyntheticDocuments $synthetic): array
    {
        $timings = [];

        for ($i = 0; $i < $queries; $i++) {
            $started = hrtime(as_number: true);
            $index->rawSearch($synthetic->words(3), [
                'filter' => 'user_id = '.$synthetic->user(),
                'vector' => $synthetic->vector(),
                'hybrid' => ['embedder' => 'text_v1', 'semanticRatio' => 0.5],
                'rankingScoreThreshold' => 0.35,
                'limit' => 40,
                'attributesToRetrieve' => ['id'],
            ]);
            $timings[] = (hrtime(as_number: true) - $started) / 1_000_000;
        }

        return $timings;
    }

    /**
     * @return list<float> milliseconds
     */
    private function timeSimilar(Indexes $index, int $queries, int $docs, int $users): array
    {
        $timings = [];

        for ($i = 0; $i < $queries; $i++) {
            $id = mt_rand(1, $docs);
            $started = hrtime(as_number: true);
            $index->searchSimilarDocuments(
                new SimilarDocumentsQuery($id, 'text_v1')
                    ->setFilter(['user_id = '.($id % $users)])
                    ->setLimit(12)
                    ->setAttributesToRetrieve(['id']),
            );
            $timings[] = (hrtime(as_number: true) - $started) / 1_000_000;
        }

        return $timings;
    }

    /**
     * @param  list<float>  $milliseconds
     */
    private function percentiles(array $milliseconds): string
    {
        sort($milliseconds);
        $at = static fn (float $p): float => $milliseconds[(int)min(
            count($milliseconds) - 1,
            floor($p * count($milliseconds)),
        )];

        return sprintf('p50 %.0f ms, p95 %.0f ms, max %.0f ms', $at(0.5), $at(0.95), end($milliseconds));
    }

    /**
     * Writes are accepted at once and applied later: wait until the engine has nothing left to do for the index.
     */
    private function settle(Client $engine, string $uid): void
    {
        $waiting = new TasksQuery()->setIndexUids([$uid])->setStatuses(['enqueued', 'processing']);

        while ($engine->getTasks($waiting)->getTotal() > 0) {
            usleep(microseconds: 200_000);
        }
    }

    private function size(Indexes $index): string
    {
        /** @var array{rawDocumentDbSize?: int} $stats */
        $stats = $index->stats();

        return number_format(($stats['rawDocumentDbSize'] ?? 0) / 1_048_576, decimals: 1).' MB of documents';
    }

    private function number(string $name): int
    {
        $value = $this->option($name);

        return is_scalar($value) ? (int)$value : 0;
    }
}
