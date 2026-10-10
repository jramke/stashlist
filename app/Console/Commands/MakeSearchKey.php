<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Stash;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Meilisearch\Client;
use Meilisearch\Exceptions\ExceptionInterface;

#[Signature('stashlist:search-key')]
#[Description(
    'Make the search-only key that searches are signed with (tenant tokens), and print the settings for .env',
)]
final class MakeSearchKey extends Command
{
    public function handle(Client $engine): int
    {
        $index = new Stash()->searchableAs();

        try {
            $key = $engine->createKey([
                'name' => 'stashlist-search',
                'description' => 'Search only: the key tenant tokens are signed with',
                'actions' => ['search'],
                'indexes' => [$index],
                'expiresAt' => null,
            ]);
        } catch (ExceptionInterface $failure) {
            $this->components->error('The search engine refused: '.$failure->getMessage());

            return self::FAILURE;
        }

        $this->components->info('Put these in the environment of the app, then restart it:');
        $this->line('MEILISEARCH_SEARCH_KEY='.(string)$key->getKey());
        $this->line('MEILISEARCH_SEARCH_KEY_UID='.(string)$key->getUid());

        return self::SUCCESS;
    }
}
