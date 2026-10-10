<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\ExportStatus;
use App\Export\ExportBuilder;
use App\Models\Export;
use App\Models\User;
use App\Storage\ExportStorage;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Builds the zip of an export and makes it downloadable for a week. The job carries two ids and reads the rest
 * when it runs.
 */
final class BuildExport implements ShouldQueue
{
    use Queueable;

    public int $timeout = 3600;

    public int $tries = 1;

    /** How long the download stays available. */
    public const DAYS = 7;

    public function __construct(
        public readonly int $exportId,
        public readonly int $userId,
    ) {
        $this->onQueue('maintenance');
    }

    public function handle(ExportBuilder $builder, ExportStorage $storage): void
    {
        $export = Export::query()->where('user_id', $this->userId)->find($this->exportId);
        $user = User::query()->find($this->userId);

        if ($export === null || $user === null || $user->deleting_at !== null) {
            return;
        }

        $export->forceFill(['status' => ExportStatus::Running])->save();
        $zip = sys_get_temp_dir().'/stashlist-export-'.Str::random(12).'.zip';

        try {
            $count = $builder->build($user, $zip);
            $path = $storage->store($user->id, $export->id, $zip);

            $export->forceFill([
                'status' => ExportStatus::Ready,
                'path' => $path,
                'bytes' => (int)filesize($zip),
                'stash_count' => $count,
                'error' => null,
                'expires_at' => now()->addDays(self::DAYS),
            ])->save();
        } catch (Throwable $failure) {
            Log::error('An export failed.', ['export' => $export->id, 'exception' => $failure::class]);

            $export->forceFill(['status' => ExportStatus::Failed, 'error' => 'The export could not be built.'])->save();
        } finally {
            File::delete($zip);
        }
    }
}
