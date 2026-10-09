<?php

declare(strict_types=1);

use App\Actions\Stashes\DeleteStash;
use App\Enums\FileRole;
use App\Jobs\PurgeStashFiles;
use App\Models\Collection;
use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Models\StashFile;
use App\Models\Tag;
use App\Storage\Blob;
use App\Storage\StashStorage;
use App\Tags\TagSync;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake();
    Queue::fake();

    $this->stash = Stash::factory()->create();
    $this->storage = app(StashStorage::class);
});

test('deleting a stash removes the row and everything that hangs on it', function () {
    $collection = Collection::factory()->for($this->stash->user)->create();
    $this->stash->collections()->attach($collection->id, ['user_id' => $this->stash->user_id, 'created_at' => now()]);
    $tag = app(TagSync::class)->addByUser($this->stash, 'design');
    $other = Stash::factory()->for($this->stash->user)->create();
    app(TagSync::class)->addByUser($other, 'design');
    StashEnrichment::query()->create([
        'stash_id' => $this->stash->id,
        'user_id' => $this->stash->user_id,
        'title' => 'Hello',
    ]);
    $this->storage->store($this->stash, FileRole::Thumb, new Blob('thumb', 'image/webp'));

    app(DeleteStash::class)->delete($this->stash);

    expect(Stash::find($this->stash->id))
        ->toBeNull()
        ->and(StashEnrichment::count())
        ->toBe(0)
        ->and(StashFile::count())
        ->toBe(0)
        ->and($collection->stashes()->count())
        ->toBe(0)
        ->and(Tag::findOrFail($tag->id)->stashes_count)
        ->toBe(1)
        ->and(Stash::find($other->id))
        ->not->toBeNull();
});

test('the stored objects are removed by a queued job after the commit', function () {
    $file = $this->storage->store($this->stash, FileRole::Original, new Blob('original', 'image/png'));
    $sibling = $this->storage->store(
        Stash::factory()->for($this->stash->user)->create(),
        FileRole::Original,
        new Blob('sibling', 'image/png'),
    );

    app(DeleteStash::class)->delete($this->stash);

    Queue::assertPushed(
        PurgeStashFiles::class,
        fn (PurgeStashFiles $job): bool => $job->userId === $this->stash->user_id && $job->stashId === $this->stash->id,
    );

    Storage::assertExists($file->path);

    new PurgeStashFiles($this->stash->user_id, $this->stash->id)->handle($this->storage);

    Storage::assertMissing($file->path);
    Storage::assertExists($sibling->path);
});

test('the purge job is retried with a growing delay', function () {
    $job = new PurgeStashFiles(1, 2);

    expect($job->tries)->toBe(5)->and($job->backoff())->toBe([10, 60, 300, 900]);
});

test('a queued extraction for a deleted stash ends quietly', function () {
    app(DeleteStash::class)->delete($this->stash);

    Queue::fake([]);
    $web = Tests\Support\FakeWeb::install([], []);

    dispatch_sync(new App\Jobs\ExtractContent($this->stash->id, $this->stash->user_id));

    expect($web->requestCount())->toBe(0);
});
