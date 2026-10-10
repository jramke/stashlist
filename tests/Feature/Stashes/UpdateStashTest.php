<?php

declare(strict_types=1);

use App\Jobs\ExtractContent;
use App\Models\Stash;
use App\Models\User;
use App\Support\UrlNormalizer;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    Queue::fake();

    $this->user = User::factory()->create();
});

function patch_stash(Stash $stash, array $data): Illuminate\Testing\TestResponse
{
    return test()
        ->actingAs(test()->user)
        ->followingRedirects()
        ->from("/stashes/{$stash->id}")
        ->patch("/stashes/{$stash->id}", $data);
}

test('title and privacy can be changed without restarting the pipeline', function () {
    $stash = Stash::factory()->for($this->user)->create(['title' => 'Old']);
    $before = $stash->content_hash;

    patch_stash($stash, ['title' => 'New', 'is_private' => true])->assertOk();

    $fresh = $stash->fresh();

    expect($fresh->title)->toBe('New')->and($fresh->is_private)->toBeTrue();

    Queue::assertNothingPushed();
});

test('an empty title clears the override', function () {
    $stash = Stash::factory()->for($this->user)->create(['title' => 'Old']);

    patch_stash($stash, ['title' => ''])->assertOk();

    expect($stash->fresh()->title)->toBeNull();
});

test('only what was sent changes', function () {
    $stash = Stash::factory()->for($this->user)->create(['title' => 'Keep', 'body' => 'comment']);

    patch_stash($stash, ['is_private' => true])->assertOk();

    expect($stash->fresh()->title)->toBe('Keep')->and($stash->fresh()->body)->toBe('comment');
});

test('a changed body restarts the pipeline, an unchanged one does not', function () {
    $stash = Stash::factory()->for($this->user)->create([
        'url' => 'https://example.com/a',
        'url_hash' => UrlNormalizer::hash('https://example.com/a'),
        'body' => 'one',
    ]);

    patch_stash($stash, ['body' => 'one'])->assertOk();
    Queue::assertNothingPushed();

    patch_stash($stash, ['body' => 'two'])->assertOk();
    Queue::assertPushed(ExtractContent::class, 1);

    expect($stash->fresh()->content_hash)->not->toBeNull();
});

test('validation protects the fields', function (array $data, string $field, string $type) {
    $stash = Stash::factory()->for($this->user)->create([
        'type' => $type,
        'body' => $type === 'color' ? '#fff' : 'text',
        'url' => null,
        'url_hash' => null,
        'domain' => null,
    ]);

    $this
        ->actingAs($this->user)
        ->from("/stashes/{$stash->id}")
        ->patch("/stashes/{$stash->id}", $data)
        ->assertSessionHasErrors($field);
})->with([
    'title too long' => [['title' => str_repeat('a', times: 501)], 'title', 'note'],
    'privacy is not a flag' => [['is_private' => 'maybe'], 'is_private', 'note'],
    'a color needs a color' => [['body' => 'not a color'], 'body', 'color'],
    'a note needs text' => [['body' => ''], 'body', 'note'],
]);

test('a color can change to another color', function () {
    $stash = Stash::factory()->for($this->user)->create([
        'type' => 'color',
        'body' => '#fff',
        'url' => null,
        'url_hash' => null,
        'domain' => null,
    ]);

    patch_stash($stash, ['body' => 'rebeccapurple'])->assertOk();

    expect($stash->fresh()->body)->toBe('rebeccapurple');
});
