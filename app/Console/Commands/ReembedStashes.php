<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Ai\Embedding\Embedders;
use App\Ai\Embedding\EmbeddingText;
use App\Jobs\ReembedStashes as ReembedBatch;
use App\Models\Stash;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use InvalidArgumentException;

#[Signature('stashlist:reembed
    {--to= : The embedder to fill, a key of stashlist.embedders (default: the one search reads from)}
    {--user= : Only the stashes of this user}
    {--dry-run : Only count what would be embedded}')]
#[Description('Embed again the stashes whose vector is missing or made by another model, size or text recipe')]
final class ReembedStashes extends Command
{
    private const BATCH = 64;

    public function handle(Embedders $embedders): int
    {
        $name = $this->option('to');

        try {
            $embedder = is_string($name) && $name !== '' ? $embedders->get($name) : $embedders->forSearch();
        } catch (InvalidArgumentException $failure) {
            $this->components->error($failure->getMessage());

            return self::FAILURE;
        }

        $user = $this->option('user');
        $stale = Stash::query()
            ->whereIn('type', ['link', 'note'])
            ->whereHas('user', static fn (Builder $users) => $users->where('ai_enabled', true))
            ->whereDoesntHave('embeddings', static fn (Builder $rows) => $rows
                ->where('embedder', $embedder->name())
                ->where('model', $embedder->model())
                ->where('dimensions', $embedder->dimensions())
                ->where('recipe_version', EmbeddingText::VERSION))
            ->when(is_scalar($user) && $user !== '', static fn (Builder $query) => $query->where(
                'user_id',
                (int)$user,
            ));

        $count = $stale->count();

        if ($this->option('dry-run')) {
            $this->components->info("{$count} stashes would be embedded with {$embedder->name()}.");

            return self::SUCCESS;
        }

        $stale->select('id')->chunkById(self::BATCH, static function ($stashes) use ($embedder): void {
            dispatch(new ReembedBatch(
                array_values(array_map(intval(...), $stashes->pluck('id')->all())),
                $embedder->name(),
            ));
        });

        $this->components->info("{$count} stashes queued for {$embedder->name()} on ai-low.");

        return self::SUCCESS;
    }
}
