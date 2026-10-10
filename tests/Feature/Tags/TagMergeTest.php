<?php

declare(strict_types=1);

use App\Models\Stash;
use App\Models\Tag;
use App\Models\User;
use App\Tags\TagMerge;
use App\Tags\TagSync;
use Tests\Support\FakeSearchEngine;

beforeEach(function () {
    $this->engine = FakeSearchEngine::install();
    $this->user = User::factory()->create();
    $this->tags = app(TagSync::class);
});

/**
 * @return array{source: string, dismissed: bool}|null
 */
function link_of(Stash $stash, Tag $tag): ?array
{
    $found = $stash->tags()->where('tags.id', $tag->id)->first();

    return (
        $found === null
            ? null
            : [
                'source' => (string)$found->getRelation('pivot')->getAttribute('source'),
                'dismissed' => $found->getRelation('pivot')->getAttribute('dismissed_at') !== null,
            ]
    );
}

test('every stash with the first tag gets the second, and the first is gone', function () {
    $a = Stash::factory()->for($this->user)->create();
    $b = Stash::factory()->for($this->user)->create();
    $from = $this->tags->addByUser($a, 'baking');
    $this->tags->addByUser($b, 'baking');
    $into = $this->tags->addByUser($b, 'bread');

    app(TagMerge::class)->merge($from, $into);

    expect(Tag::query()->whereKey($from->id)->exists())
        ->toBeFalse()
        ->and(link_of($a, $into))
        ->toBe(['source' => 'user', 'dismissed' => false])
        ->and(link_of($b, $into))
        ->toBe(['source' => 'user', 'dismissed' => false])
        ->and($into->fresh()->stashes_count)
        ->toBe(2)
        ->and($b->tags()->count())
        ->toBe(1);
});

test('where a stash has both, what the user decided wins and visible wins over dismissed', function () {
    $stash = Stash::factory()->for($this->user)->create();
    $from = Tag::factory()->create(['user_id' => $this->user->id, 'name' => 'from', 'slug' => 'from']);
    $into = Tag::factory()->create(['user_id' => $this->user->id, 'name' => 'into', 'slug' => 'into']);
    $attach = fn (Tag $tag, string $source, ?Carbon\CarbonInterface $dismissedAt) => $stash->tags()->attach($tag->id, [
        'user_id' => $this->user->id,
        'source' => $source,
        'dismissed_at' => $dismissedAt,
        'created_at' => now(),
    ]);

    // User tag on one side, a machine tag on the other: the user's.
    $attach($from, 'user', null);
    $attach($into, 'ai', now());
    app(TagMerge::class)->merge($from, $into);
    expect(link_of($stash, $into))->toBe(['source' => 'user', 'dismissed' => false]);

    // A visible machine tag and a dismissed one: visible.
    $stash->tags()->detach($into->id);
    $again = Tag::factory()->create(['user_id' => $this->user->id, 'name' => 'again', 'slug' => 'again']);
    $attach($again, 'ai', null);
    $attach($into, 'ai', now());
    app(TagMerge::class)->merge($again, $into);
    expect(link_of($stash, $into))->toBe(['source' => 'ai', 'dismissed' => false]);

    // Dismissed on both sides stays dismissed, and does not count in the total.
    $stash->tags()->detach($into->id);
    $last = Tag::factory()->create(['user_id' => $this->user->id, 'name' => 'last', 'slug' => 'last']);
    $attach($last, 'ai', now());
    $attach($into, 'ai', now());
    app(TagMerge::class)->merge($last, $into);
    expect(link_of($stash, $into))
        ->toBe(['source' => 'ai', 'dismissed' => true])
        ->and($into->fresh()->stashes_count)
        ->toBe(0);
});

test('the stashes are indexed again with the new tag', function () {
    $stash = Stash::factory()->for($this->user)->create();
    $from = $this->tags->addByUser($stash, 'baking');
    $into = $this->tags->addByUser(Stash::factory()->for($this->user)->create(), 'bread');
    $this->engine->documents = [];

    app(TagMerge::class)->merge($from, $into);

    expect($this->engine->documents[$stash->id]['tags'])->toBe(['bread']);
});

test('a tag cannot be merged into itself or into someone else\'s', function () {
    $mine = $this->tags->addByUser(Stash::factory()->for($this->user)->create(), 'mine');
    $theirs = Tag::factory()->create();

    expect(fn () => app(TagMerge::class)->merge($mine, $mine))->toThrow(InvalidArgumentException::class);
    expect(fn () => app(TagMerge::class)->merge($mine, $theirs))->toThrow(InvalidArgumentException::class);
});

test('the merge button works from the tags page and says what happened', function () {
    $stash = Stash::factory()->for($this->user)->create();
    $from = $this->tags->addByUser($stash, 'baking');
    $into = $this->tags->addByUser($stash, 'bread');

    $this
        ->actingAs($this->user)
        ->from('/tags')
        ->post("/tags/{$from->id}/merge", ['into' => $into->id])
        ->assertRedirect('/tags');

    expect(Tag::query()->whereKey($from->id)->exists())->toBeFalse()->and($into->fresh()->stashes_count)->toBe(1);
});

test('the target has to be another tag of mine', function () {
    $mine = $this->tags->addByUser(Stash::factory()->for($this->user)->create(), 'mine');
    $theirs = Tag::factory()->create();

    $this->actingAs($this->user)->post("/tags/{$mine->id}/merge", [
        'into' => $theirs->id,
    ])->assertSessionHasErrors('into');
    $this->post("/tags/{$mine->id}/merge", ['into' => $mine->id])->assertSessionHasErrors('into');
    $this->post("/tags/{$mine->id}/merge", [])->assertSessionHasErrors('into');
    $this->post("/tags/{$theirs->id}/merge", ['into' => $mine->id])->assertNotFound();

    expect(Tag::query()->whereKey($mine->id)->exists())->toBeTrue();
});
