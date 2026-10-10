<?php

declare(strict_types=1);

use App\Enums\StashType;
use App\Jobs\ExtractContent;
use App\Models\Collection;
use App\Models\Stash;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Images;

beforeEach(function () {
    Queue::fake();
    Storage::fake();

    $this->user = User::factory()->create();
});

function post_stash(array $data): Illuminate\Testing\TestResponse
{
    return test()->actingAs(test()->user)->followingRedirects()->from('/stashes')->post('/stashes', $data);
}

test('guests cannot save anything', function () {
    $this->post('/stashes', ['input' => 'https://example.com'])->assertRedirect('/login');

    expect(Stash::count())->toBe(0);
});

test('a pasted link is saved, extraction is queued and the user is told', function () {
    post_stash(['input' => 'https://example.com/post'])->assertInertia(
        fn (AssertableInertia $page) => $page
            ->component('stashes/index')
            ->hasFlash('toast', ['type' => 'success', 'message' => 'Stashed.'])
            ->where('stashes.data.0.url', 'https://example.com/post'),
    );

    $stash = Stash::query()->firstOrFail();

    expect($stash->user_id)->toBe($this->user->id)->and($stash->type)->toBe(StashType::Link);

    Queue::assertPushed(ExtractContent::class, 1);
});

test('saving the same link again says so and saves nothing', function () {
    post_stash(['input' => 'https://example.com/post']);

    post_stash(['input' => 'https://example.com/post?utm_source=newsletter'])->assertInertia(
        fn (AssertableInertia $page) => $page->hasFlash('toast', [
            'type' => 'info',
            'message' => 'Already in your stashes.',
        ]),
    );

    expect(Stash::count())->toBe(1);
});

test('text and colors are saved as notes and colors', function (string $input, StashType $type) {
    post_stash(['input' => $input])->assertOk();

    expect(Stash::query()->firstOrFail()->type)->toBe($type);

    Queue::assertNothingPushed();
})->with([
    'note' => ['buy flour', StashType::Note],
    'color' => ['#e63946', StashType::Color],
]);

test('an image can be dropped on the capture box', function () {
    $upload = UploadedFile::fake()->createWithContent('cat.png', Images::make('png', width: 300, height: 200));

    post_stash(['image' => $upload, 'title' => 'My cat'])->assertOk();

    $stash = Stash::query()->firstOrFail();

    expect($stash->type)
        ->toBe(StashType::Image)
        ->and($stash->title)
        ->toBe('My cat')
        ->and($stash->files()->count())
        ->toBe(1);

    Queue::assertPushed(ExtractContent::class);
});

test('tags, privacy and my collections are applied', function () {
    $collection = Collection::factory()->for($this->user)->create();

    post_stash([
        'input' => 'https://example.com/post',
        'private' => true,
        'tags' => ['Design', 'inspiration'],
        'collection_ids' => [$collection->id],
    ])->assertOk();

    $stash = Stash::query()->firstOrFail();

    expect($stash->is_private)
        ->toBeTrue()
        ->and($stash->tags()->orderBy('name')->pluck('name')->all())
        ->toBe(['Design', 'inspiration'])
        ->and($stash->collections()->pluck('collections.id')->all())
        ->toBe([$collection->id]);
});

test('invalid requests are refused and save nothing', function (array $data, string $field) {
    $this->actingAs($this->user)->from('/stashes')->post('/stashes', $data)->assertSessionHasErrors($field);

    expect(Stash::count())->toBe(0);
})->with([
    'nothing at all' => [[], 'input'],
    'empty input' => [['input' => '   '], 'input'],
    'too many tags' => [['input' => 'x', 'tags' => array_fill(start_index: 0, count: 21, value: 't')], 'tags'],
    'title too long' => [['input' => 'x', 'title' => str_repeat('a', times: 501)], 'title'],
]);

test('an svg or a text file is not an image', function (string $content) {
    $upload = UploadedFile::fake()->createWithContent('x.png', $content);

    $this
        ->actingAs($this->user)
        ->from('/stashes')
        ->post('/stashes', ['image' => $upload])
        ->assertSessionHasErrors('image');

    expect(Stash::count())->toBe(0);
})->with([
    'svg' => ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
    'text' => ['not an image'],
]);

test("another user's collection cannot be used", function () {
    $foreign = Collection::factory()->create();

    $this
        ->actingAs($this->user)
        ->from('/stashes')
        ->post('/stashes', ['input' => 'https://example.com', 'collection_ids' => [$foreign->id]])
        ->assertSessionHasErrors('collection_ids.0');

    expect(Stash::count())->toBe(0);
});

test('saving is rate limited per user', function () {
    $middleware = Route::getRoutes()->getByName('stashes.store')?->gatherMiddleware() ?? [];

    expect($middleware)->toContain('throttle:capture');
});
