<?php

declare(strict_types=1);

use App\Enums\FileRole;
use App\Models\Stash;
use App\Models\StashFile;
use App\Storage\Blob;
use App\Storage\StashStorage;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake();

    $this->storage = app(StashStorage::class);
    $this->stash = Stash::factory()->create();
});

test('a file is stored under the stash directory with its hash in the name', function () {
    $file = $this->storage->store(
        $this->stash,
        FileRole::Thumb,
        new Blob('thumb-bytes', 'image/webp', width: 640, height: 480),
    );

    $sha8 = substr(hash(algo: 'sha256', data: 'thumb-bytes'), offset: 0, length: 8);

    expect($file->path)
        ->toBe("u/{$this->stash->user_id}/i/{$this->stash->id}/thumb-{$sha8}.webp")
        ->and($file->mime)
        ->toBe('image/webp')
        ->and($file->bytes)
        ->toBe(strlen('thumb-bytes'))
        ->and($file->width)
        ->toBe(640)
        ->and($file->height)
        ->toBe(480)
        ->and($file->sha256)
        ->toBeNull();

    Storage::assertExists($file->path);
    expect(Storage::get($file->path))->toBe('thumb-bytes');
});

test('only originals record their sha256', function () {
    $file = $this->storage->store($this->stash, FileRole::Original, new Blob('original-bytes', 'image/jpeg'));

    expect($file->sha256)->toBe(hash(algo: 'sha256', data: 'original-bytes'))->and($file->path)->toEndWith('.jpg');
});

test('unknown mime types fall back to bin', function () {
    expect($this->storage->store($this->stash, FileRole::Original, new Blob('x', 'application/x-weird'))->path)
        ->toEndWith('.bin');
});

test('storing a role again replaces the object and the row', function () {
    $first = $this->storage->store($this->stash, FileRole::Thumb, new Blob('one', 'image/webp'));
    $second = $this->storage->store($this->stash, FileRole::Thumb, new Blob('two', 'image/webp'));

    expect($second->id)
        ->toBe($first->id)
        ->and($second->path)
        ->not
        ->toBe($first->path)
        ->and($this->stash->files()->count())
        ->toBe(1);

    Storage::assertMissing($first->path);
    Storage::assertExists($second->path);
});

test('storing identical bytes again changes nothing', function () {
    $first = $this->storage->store($this->stash, FileRole::Thumb, new Blob('same', 'image/webp'));
    $second = $this->storage->store($this->stash, FileRole::Thumb, new Blob('same', 'image/webp'));

    expect($second->path)->toBe($first->path)->and(StashFile::count())->toBe(1);

    Storage::assertExists($first->path);
});

test('forgetting a file removes the object and the row', function () {
    $file = $this->storage->store($this->stash, FileRole::Preview, new Blob('preview', 'image/webp'));

    $this->storage->forget($file);

    Storage::assertMissing($file->path);
    expect(StashFile::count())->toBe(0);
});

test('purging a stash removes its objects and nothing else', function () {
    $other = Stash::factory()->for($this->stash->user)->create();
    $foreign = Stash::factory()->create();

    $mine = [
        $this->storage->store($this->stash, FileRole::Original, new Blob('a', 'image/png')),
        $this->storage->store($this->stash, FileRole::Thumb, new Blob('b', 'image/webp')),
    ];
    $sibling = $this->storage->store($other, FileRole::Thumb, new Blob('c', 'image/webp'));
    $stranger = $this->storage->store($foreign, FileRole::Thumb, new Blob('d', 'image/webp'));

    $this->storage->purgeStash($this->stash->user_id, $this->stash->id);

    foreach ($mine as $file) {
        Storage::assertMissing($file->path);
    }

    Storage::assertExists($sibling->path);
    Storage::assertExists($stranger->path);
});

test('purging a user removes all of their objects', function () {
    $other = Stash::factory()->for($this->stash->user)->create();
    $foreign = Stash::factory()->create();

    $a = $this->storage->store($this->stash, FileRole::Thumb, new Blob('a', 'image/webp'));
    $b = $this->storage->store($other, FileRole::Thumb, new Blob('b', 'image/webp'));
    $stranger = $this->storage->store($foreign, FileRole::Thumb, new Blob('c', 'image/webp'));

    $this->storage->purgeUser($this->stash->user_id);

    Storage::assertMissing($a->path);
    Storage::assertMissing($b->path);
    Storage::assertExists($stranger->path);
});

test('the signed url is stable within the hour and names the object', function () {
    $file = $this->storage->store($this->stash, FileRole::Thumb, new Blob('thumb', 'image/webp'));

    $this->travelTo(now()->startOfHour()->addMinutes(10));
    $first = $this->storage->url($file);

    $this->travel(40)->minutes();
    $sameHour = $this->storage->url($file);

    $this->travel(30)->minutes();
    $nextHour = $this->storage->url($file);

    expect($first)
        ->toContain($file->path)
        ->toContain('expiration=')
        ->and($sameHour)
        ->toBe($first)
        ->and($nextHour)
        ->not->toBe($first);
});
