<?php

declare(strict_types=1);

use App\Jobs\DeleteExpiredExports;
use App\Jobs\RetryFailedStashes;
use App\Jobs\SweepStuckStashes;
use App\Models\StashRun;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

// @mago-expect analysis:undefined-variable
// @mago-expect analysis:mixed-method-access
Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::job(new SweepStuckStashes)->everyTenMinutes();
Schedule::job(new RetryFailedStashes)->dailyAt('03:30');
Schedule::command('model:prune', ['--model' => [StashRun::class]])->dailyAt('04:00');
Schedule::job(new DeleteExpiredExports)->hourly();
