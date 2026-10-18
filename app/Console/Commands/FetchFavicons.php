<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\StashType;
use App\Jobs\FetchFavicon;
use App\Models\Stash;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;

#[Signature('stashlist:favicons
    {--user= : Only the stashes of this user}
    {--dry-run : Only count what would be fetched}')]
#[Description('Fetch the icon of the site of every link that has none yet, from the sites themselves')]
final class FetchFavicons extends Command
{
    public function handle(): int
    {
        $user = $this->option('user');
        $missing = Stash::query()
            ->where('type', StashType::Link->value)
            ->whereNotNull('domain')
            ->whereDoesntHave('favicon')
            ->when(is_scalar($user) && $user !== '', static fn (Builder $query) => $query->where(
                'user_id',
                (int)$user,
            ));

        $count = $missing->count();

        if ($this->option('dry-run')) {
            $this->components->info("{$count} links would get an icon.");

            return self::SUCCESS;
        }

        $missing->select(['id', 'user_id'])->each(static function (Stash $stash): void {
            dispatch(new FetchFavicon($stash->id, $stash->user_id));
        });

        $this->components->info("{$count} links queued on scrape.");

        return self::SUCCESS;
    }
}
