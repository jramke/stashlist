<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Images\ImageProcessor;
use App\Jobs\MakeSmallThumbnails;
use App\Models\Stash;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;

#[Signature('stashlist:small-thumbs
    {--user= : Only the stashes of this user}
    {--dry-run : Only count what would be made}')]
#[Description('Make the small thumbnail of the pictures that were processed before it existed')]
final class SmallThumbnails extends Command
{
    private const BATCH = 25;

    public function handle(): int
    {
        $user = $this->option('user');
        $stale = Stash::query()
            ->whereHas('thumbnail', static fn (Builder $files) => $files->where(
                'width',
                '>',
                ImageProcessor::THUMB_SMALL_WIDTH,
            ))
            ->whereDoesntHave('thumbnailSmall')
            ->when(is_scalar($user) && $user !== '', static fn (Builder $query) => $query->where(
                'user_id',
                (int)$user,
            ));

        $count = $stale->count();

        if ($this->option('dry-run')) {
            $this->components->info("{$count} stashes would get a small thumbnail.");

            return self::SUCCESS;
        }

        $stale->select('id')->chunkById(self::BATCH, static function ($stashes): void {
            dispatch(new MakeSmallThumbnails(array_values(array_map(intval(...), $stashes->pluck('id')->all()))));
        });

        $this->components->info("{$count} stashes queued on maintenance.");

        return self::SUCCESS;
    }
}
