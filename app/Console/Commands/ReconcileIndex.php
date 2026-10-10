<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Search\Reconciler;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Meilisearch\Exceptions\ExceptionInterface;

#[Signature('stashlist:reconcile-index {--dry-run : Only report, change nothing}')]
#[Description(
    'Compare the search index with the database: remove ghosts, queue what is missing, list failed index tasks',
)]
final class ReconcileIndex extends Command
{
    public function handle(Reconciler $reconciler): int
    {
        $dryRun = (bool)$this->option('dry-run');

        try {
            $report = $dryRun ? $reconciler->inspect() : $reconciler->repair();
        } catch (ExceptionInterface $failure) {
            $this->components->error('The search engine could not be asked: '.$failure->getMessage());

            return self::FAILURE;
        }

        $verb = $dryRun ? 'would be' : 'were';

        $this->components->info(sprintf('%d documents without a stash %s removed.', count($report->ghosts), $verb));
        $this->components->info(sprintf('%d stashes without a document %s queued.', count($report->missing), $verb));

        foreach ($report->failedTasks as $failed) {
            $this->components->warn("Failed index task: {$failed}");
        }

        return $report->isClean() ? self::SUCCESS : self::FAILURE;
    }
}
