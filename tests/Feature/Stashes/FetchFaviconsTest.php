<?php

declare(strict_types=1);

use App\Enums\FileRole;
use App\Jobs\FetchFavicon;
use App\Models\Stash;
use App\Models\User;
use App\Storage\Blob;
use App\Storage\StashStorage;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake();
    Queue::fake();
});

test('every link without an icon is queued on the scrape queue, and nothing else is', function () {
    $without = Stash::factory()->create();
    $with = Stash::factory()->create();
    app(StashStorage::class)->store($with, FileRole::Favicon, new Blob('icon', 'image/webp', 16, 16));
    Stash::factory()->note()->create();

    $this->artisan('stashlist:favicons')->assertSuccessful()->expectsOutputToContain('1 links queued');

    Queue::assertPushed(FetchFavicon::class, 1);
    Queue::assertPushedOn(
        'scrape',
        FetchFavicon::class,
        fn (FetchFavicon $job): bool => $job->stashId === $without->id && $job->userId === $without->user_id,
    );
});

test('a dry run only counts, and a user can be asked for alone', function () {
    $mine = Stash::factory()->for(User::factory()->create())->create();
    Stash::factory()->create();

    $this->artisan('stashlist:favicons', ['--dry-run' => true])->expectsOutputToContain('2 links would get an icon');
    Queue::assertNotPushed(FetchFavicon::class);

    $this->artisan('stashlist:favicons', ['--user' => $mine->user_id])->assertSuccessful();

    Queue::assertPushed(FetchFavicon::class, 1);
    Queue::assertPushed(FetchFavicon::class, fn (FetchFavicon $job): bool => $job->stashId === $mine->id);
});
