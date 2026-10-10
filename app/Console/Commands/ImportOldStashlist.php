<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\StashType;
use App\Import\ImportOldSaves;
use App\Import\ImportReport;
use App\Import\OldDump;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use RuntimeException;

#[Signature('stashlist:import-old
    {dump : Path to the SQL dump of the old app}
    {--user= : Id of the user here who receives the saves}
    {--old-user= : Id of the user in the dump, when the dump holds several}
    {--dry-run : Only count what would be imported}')]
#[Description('One-time import of the saves of the old Stashlist from its SQL dump')]
final class ImportOldStashlist extends Command
{
    public function handle(ImportOldSaves $importer): int
    {
        $userId = $this->text('user');
        $user = $userId === null ? null : User::query()->find($userId);

        if (! $user instanceof User) {
            $this->components->error('Pass the id of an existing user with --user. Sign in once to create yours.');

            return self::FAILURE;
        }

        try {
            $dump = new OldDump($this->text('dump') ?? '');
            $oldUserId = $dump->ownerFor($this->text('old-user'));
        } catch (RuntimeException $failure) {
            $this->components->error($failure->getMessage());

            return self::FAILURE;
        }

        $saves = $dump->saves($oldUserId);

        $this->report($this->option('dry-run') ? $importer->preview($user, $saves) : $importer->import($user, $saves));

        return self::SUCCESS;
    }

    /**
     * An argument or option as text; null when it was not given.
     */
    private function text(string $name): ?string
    {
        $value = $this->hasArgument($name) ? $this->argument($name) : $this->option($name);

        return is_scalar($value) && (string)$value !== '' ? (string)$value : null;
    }

    private function report(ImportReport $report): void
    {
        $dryRun = (bool)$this->option('dry-run');

        $this->table(
            ['', $dryRun ? 'Would import' : 'Imported', 'Already there'],
            [
                ...array_map(
                    static fn (StashType $type): array => [
                        $type->value,
                        $report->createdCount($type),
                        $report->existingCount($type),
                    ],
                    [StashType::Link, StashType::Note, StashType::Image, StashType::Color],
                ),
                ['total', $report->createdCount(), $report->existingCount()],
            ],
        );

        foreach ($report->skippedByReason() as $reason => $count) {
            $this->components->warn("Skipped {$count}: {$reason}");
        }

        if ($dryRun) {
            $this->components->info('Dry run: nothing was written.');

            return;
        }

        $this->components->info(
            'Done. Extraction runs on the queue and fetches every imported link again; let it finish.',
        );
    }
}
