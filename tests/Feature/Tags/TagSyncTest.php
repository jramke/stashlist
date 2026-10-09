<?php

declare(strict_types=1);

use App\Enums\TagSource;
use App\Models\Stash;
use App\Models\Tag;
use App\Tags\TagSync;

beforeEach(function () {
    $this->sync = new TagSync;
    $this->stash = Stash::factory()->create();
});

function pivot_row(Stash $stash, Tag $tag): ?stdClass
{
    $row = $stash->tags()->where('tags.id', $tag->id)->first()?->pivot;

    return $row === null ? null : (object)$row->getAttributes();
}

test('adding a tag creates it and links it as a user tag', function () {
    $tag = $this->sync->addByUser($this->stash, '  #Web   Design ');

    $row = pivot_row($this->stash, $tag);

    expect($tag->name)
        ->toBe('Web Design')
        ->and($tag->slug)
        ->toBe('web design')
        ->and($tag->user_id)
        ->toBe($this->stash->user_id)
        ->and($tag->stashes_count)
        ->toBe(1)
        ->and($row->source)
        ->toBe('user')
        ->and($row->user_id)
        ->toBe($this->stash->user_id)
        ->and($row->dismissed_at)
        ->toBeNull()
        ->and($row->created_at)
        ->not->toBeNull();
});

test('the same tag is reused whatever its case', function () {
    $first = $this->sync->addByUser($this->stash, 'Design');
    $second = $this->sync->addByUser($this->stash, 'design');
    $other = $this->sync->addByUser(Stash::factory()->for($this->stash->user)->create(), 'DESIGN');

    expect($second->id)
        ->toBe($first->id)
        ->and($other->id)
        ->toBe($first->id)
        ->and($first->fresh()->stashes_count)
        ->toBe(2)
        ->and(Tag::count())
        ->toBe(1);
});

test('adding the same tag twice to one stash counts once', function () {
    $tag = $this->sync->addByUser($this->stash, 'design');
    $this->sync->addByUser($this->stash, 'design');

    expect($tag->fresh()->stashes_count)->toBe(1)->and($this->stash->tags()->count())->toBe(1);
});

test('tags are never shared between users', function () {
    $mine = $this->sync->addByUser($this->stash, 'design');
    $theirs = $this->sync->addByUser(Stash::factory()->create(), 'design');

    expect($theirs->id)->not->toBe($mine->id)->and(Tag::count())->toBe(2);
});

test('an empty name is refused', function () {
    expect(fn () => $this->sync->addByUser($this->stash, ' # '))->toThrow(InvalidArgumentException::class);
});

test('removing a user tag deletes the link and updates the count', function () {
    $tag = $this->sync->addByUser($this->stash, 'design');

    $this->sync->removeByUser($this->stash, $tag);

    expect(pivot_row($this->stash, $tag))->toBeNull()->and($tag->fresh()->stashes_count)->toBe(0);
});

test('removing a tag the stash does not have does nothing', function () {
    $tag = Tag::factory()->for($this->stash->user)->create();

    $this->sync->removeByUser($this->stash, $tag);

    expect($tag->fresh()->stashes_count)->toBe(0);
});

test('removing an ai tag keeps a dismissed tombstone', function () {
    $tag = Tag::factory()->for($this->stash->user)->create(['stashes_count' => 1]);
    $this->stash->tags()->attach($tag->id, [
        'user_id' => $this->stash->user_id,
        'source' => TagSource::Ai->value,
        'created_at' => now(),
    ]);

    $this->sync->removeByUser($this->stash, $tag);

    $row = pivot_row($this->stash, $tag);

    expect($row->source)
        ->toBe('ai')
        ->and($row->dismissed_at)
        ->not
        ->toBeNull()
        ->and($tag->fresh()->stashes_count)
        ->toBe(0);
});

test('adding a dismissed ai tag turns it into a user tag again', function () {
    $tag = Tag::factory()->for($this->stash->user)->create(['name' => 'Design', 'slug' => 'design']);
    $this->stash->tags()->attach($tag->id, [
        'user_id' => $this->stash->user_id,
        'source' => TagSource::Ai->value,
        'dismissed_at' => now(),
        'created_at' => now(),
    ]);

    $this->sync->addByUser($this->stash, 'design');

    $row = pivot_row($this->stash, $tag);

    expect($row->source)->toBe('user')->and($row->dismissed_at)->toBeNull()->and($tag->fresh()->stashes_count)->toBe(1);
});

test('adding a visible ai tag promotes it without counting twice', function () {
    $tag = Tag::factory()->for($this->stash->user)->create([
        'name' => 'Design',
        'slug' => 'design',
        'stashes_count' => 1,
    ]);
    $this->stash->tags()->attach($tag->id, [
        'user_id' => $this->stash->user_id,
        'source' => TagSource::Ai->value,
        'created_at' => now(),
    ]);

    $this->sync->addByUser($this->stash, 'Design');

    expect(pivot_row($this->stash, $tag)->source)->toBe('user')->and($tag->fresh()->stashes_count)->toBe(1);
});
