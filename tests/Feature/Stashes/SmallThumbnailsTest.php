<?php

declare(strict_types=1);

use App\Enums\FileRole;
use App\Models\Stash;
use App\Models\User;
use App\Storage\Blob;
use App\Storage\StashStorage;
use Illuminate\Support\Facades\Storage;
use Tests\Support\Images;

beforeEach(function () {
    Storage::fake();
    $this->storage = app(StashStorage::class);
});

/**
 * A stash with a thumbnail of the given width and no small one, as every stash was before the small one existed.
 */
function stash_with_thumbnail(int $width, ?User $owner = null): Stash
{
    $stash = Stash::factory()
        ->for($owner ?? User::factory()->create())
        ->create();

    app(StashStorage::class)->store(
        $stash,
        FileRole::Thumb,
        new Blob(Images::make('webp', $width, intdiv($width, 2)), 'image/webp', $width, intdiv($width, 2)),
    );

    return $stash;
}

test('a stash whose picture is older than the small thumbnail gets one, made from its thumbnail', function () {
    $stash = stash_with_thumbnail(640);

    $this->artisan('stashlist:small-thumbs')->assertSuccessful();

    $small = $stash->fresh()->thumbnailSmall;

    expect($small?->width)
        ->toBe(400)
        ->and($small?->height)
        ->toBe(200)
        ->and($small?->mime)
        ->toBe('image/webp');
    Storage::assertExists($small->path);
});

test('a thumbnail that is small enough already, and a stash that has one, are left alone', function () {
    $narrow = stash_with_thumbnail(300);
    $done = stash_with_thumbnail(640);
    $this->storage->store($done, FileRole::ThumbSmall, new Blob('kept', 'image/webp', 400, 200));
    $before = $done->thumbnailSmall()->first()->path;

    $this->artisan('stashlist:small-thumbs')->assertSuccessful();

    expect($narrow->fresh()->thumbnailSmall)
        ->toBeNull()
        ->and($done->fresh()->thumbnailSmall->path)
        ->toBe($before);
});

test('a dry run only counts, and a user can be asked for alone', function () {
    $mine = stash_with_thumbnail(640);
    $theirs = stash_with_thumbnail(640);

    $this->artisan('stashlist:small-thumbs', ['--dry-run' => true])->expectsOutputToContain('2 stashes');

    expect($mine->fresh()->thumbnailSmall)->toBeNull();

    $this->artisan('stashlist:small-thumbs', ['--user' => $mine->user_id])->assertSuccessful();

    expect($mine->fresh()->thumbnailSmall)
        ->not
        ->toBeNull()
        ->and($theirs->fresh()->thumbnailSmall)
        ->toBeNull();
});

test('a thumbnail that cannot be read leaves its card on the big picture', function () {
    $stash = stash_with_thumbnail(640);
    Storage::fake();

    $this->artisan('stashlist:small-thumbs')->assertSuccessful();

    expect($stash->fresh()->thumbnailSmall)->toBeNull();
});
