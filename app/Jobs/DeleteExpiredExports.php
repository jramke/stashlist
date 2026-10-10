<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Export;
use App\Storage\ExportStorage;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Hourly: removes the zips whose week is over, and their rows. Object storage lifecycle rules are not relied on.
 */
final class DeleteExpiredExports implements ShouldQueue
{
    use Queueable;

    public function __construct()
    {
        $this->onQueue('maintenance');
    }

    public function handle(ExportStorage $storage): void
    {
        Export::query()
            ->where('expires_at', '<', now())
            ->each(static function (Export $export) use ($storage): void {
                if ($export->path !== null) {
                    $storage->forget($export->path);
                }

                $export->delete();
            });
    }
}
