<?php

declare(strict_types=1);

use App\Models\Collection;
use App\Models\Stash;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->alice = User::factory()->create();
    $this->bob = User::factory()->create();

    $this->aliceStash = Stash::factory()->for($this->alice)->create();
    $this->aliceTag = Tag::factory()->for($this->alice)->create();
    $this->aliceCollection = Collection::factory()->for($this->alice)->create();
    $this->bobTag = Tag::factory()->for($this->bob)->create();
    $this->bobCollection = Collection::factory()->for($this->bob)->create();
});

test('a stash and a tag of the same user can be linked', function () {
    DB::table('stash_tag')->insert([
        'stash_id' => $this->aliceStash->id,
        'tag_id' => $this->aliceTag->id,
        'user_id' => $this->alice->id,
        'source' => 'user',
    ]);

    expect(DB::table('stash_tag')->count())->toBe(1);
});

test('a stash cannot be linked to the tag of another user', function (string $claimedOwner) {
    DB::table('stash_tag')->insert([
        'stash_id' => $this->aliceStash->id,
        'tag_id' => $this->bobTag->id,
        'user_id' => $this->{$claimedOwner}->id,
        'source' => 'user',
    ]);
})->with(['alice', 'bob'])->throws(QueryException::class);

test('a stash cannot be put into the collection of another user', function (string $claimedOwner) {
    DB::table('collection_stash')->insert([
        'collection_id' => $this->bobCollection->id,
        'stash_id' => $this->aliceStash->id,
        'user_id' => $this->{$claimedOwner}->id,
    ]);
})->with(['alice', 'bob'])->throws(QueryException::class);

test('a highlight cannot be put on the stash of another user', function (string $claimedOwner) {
    DB::table('stash_highlights')->insert([
        'stash_id' => $this->aliceStash->id,
        'user_id' => $this->{$claimedOwner}->id,
        'text' => 'a passage',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
})->with(['bob'])->throws(QueryException::class);

test('a highlight of the owner is accepted', function () {
    DB::table('stash_highlights')->insert([
        'stash_id' => $this->aliceStash->id,
        'user_id' => $this->alice->id,
        'text' => 'a passage',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    expect(DB::table('stash_highlights')->count())->toBe(1);
});

test('a file cannot be attached to the stash of another user', function () {
    DB::table('stash_files')->insert([
        'stash_id' => $this->aliceStash->id,
        'user_id' => $this->bob->id,
        'role' => 'thumb',
        'path' => 'u/'.$this->bob->id.'/i/'.$this->aliceStash->id.'/thumb-abcd1234.webp',
        'mime' => 'image/webp',
        'bytes' => 1234,
    ]);
})->throws(QueryException::class);

test('deleting a stash removes its links and files', function () {
    DB::table('stash_tag')->insert([
        'stash_id' => $this->aliceStash->id,
        'tag_id' => $this->aliceTag->id,
        'user_id' => $this->alice->id,
        'source' => 'ai',
    ]);
    DB::table('collection_stash')->insert([
        'collection_id' => $this->aliceCollection->id,
        'stash_id' => $this->aliceStash->id,
        'user_id' => $this->alice->id,
    ]);

    $this->aliceStash->delete();

    expect(DB::table('stash_tag')->count())
        ->toBe(0)
        ->and(DB::table('collection_stash')->count())
        ->toBe(0);
});

test('the same url cannot be saved twice by one user but can by two', function () {
    $hash = hash(algo: 'sha256', data: 'https://example.com/a', binary: true);

    Stash::factory()->for($this->alice)->create(['url_hash' => $hash]);
    Stash::factory()->for($this->bob)->create(['url_hash' => $hash]);

    expect(fn () => Stash::factory()->for($this->alice)->create(['url_hash' => $hash]))->toThrow(QueryException::class);
});
