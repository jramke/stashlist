<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Stash;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('stashlist:reindex {--user= : Only the stashes of this user}')]
#[Description('Rebuild the search documents from the database, vectors included; no provider is called')]
final class ReindexStashes extends Command
{
    public function handle(): int
    {
        $user = $this->option('user');

        // Documents are written over the old ones, so the search keeps answering while this runs.
        $stashes = Stash::query()->when(is_scalar($user) && $user !== '', static fn ($query) => $query->where(
            'user_id',
            (int)$user,
        ));
        $count = $stashes->count();

        // @mago-expect analysis:non-documented-method
        $stashes->searchable(500);

        $this->components->info("{$count} stashes queued for indexing.");

        return self::SUCCESS;
    }
}
