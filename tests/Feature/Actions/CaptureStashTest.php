<?php

declare(strict_types=1);

use App\Actions\Stashes\CapturePayload;
use App\Actions\Stashes\CaptureStash;
use App\Enums\AiStatus;
use App\Enums\FileRole;
use App\Enums\StashType;
use App\Images\InvalidImage;
use App\Jobs\ExtractContent;
use App\Jobs\IndexStash;
use App\Models\Collection;
use App\Models\Stash;
use App\Models\Tag;
use App\Models\User;
use App\Support\UrlNormalizer;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\Support\Images;

beforeEach(function () {
    Queue::fake();
    Storage::fake();

    $this->user = User::factory()->create();
    $this->capture = app(CaptureStash::class);
});

test('a link is saved with its dedupe hash and domain and extraction starts', function () {
    $result = $this->capture->capture(
        $this->user,
        new CapturePayload(input: ' https://www.Example.com/post?utm_source=x#top '),
    );

    $stash = $result->stash->fresh();

    expect($result->created)
        ->toBeTrue()
        ->and($stash->type)
        ->toBe(StashType::Link)
        ->and($stash->url)
        ->toBe('https://www.Example.com/post?utm_source=x#top')
        ->and($stash->url_hash)
        ->toBe(UrlNormalizer::hash('https://www.example.com/post'))
        ->and($stash->domain)
        ->toBe('example.com')
        ->and($stash->user_id)
        ->toBe($this->user->id)
        ->and($stash->is_private)
        ->toBeFalse()
        ->and($stash->ai_status)
        ->toBe(AiStatus::Skipped)
        ->and($stash->content_hash)
        ->toHaveLength(64);

    Queue::assertPushed(
        ExtractContent::class,
        fn (ExtractContent $job): bool => $job->stashId === $stash->id && $job->userId === $this->user->id,
    );
    Queue::assertPushedWithChain(ExtractContent::class, [IndexStash::class]);
});

test('the same link again returns the stash that exists', function () {
    $first = $this->capture->capture($this->user, new CapturePayload(input: 'https://example.com/post'));
    $second = $this->capture->capture(
        $this->user,
        new CapturePayload(input: 'https://EXAMPLE.com/post?utm_campaign=x#section'),
    );

    expect($second->created)
        ->toBeFalse()
        ->and($second->stash->id)
        ->toBe($first->stash->id)
        ->and(Stash::count())
        ->toBe(1);

    Queue::assertPushed(ExtractContent::class, 1);
});

test('two users can save the same link', function () {
    $other = User::factory()->create();

    $mine = $this->capture->capture($this->user, new CapturePayload(input: 'https://example.com/post'));
    $theirs = $this->capture->capture($other, new CapturePayload(input: 'https://example.com/post'));

    expect($theirs->created)
        ->toBeTrue()
        ->and($theirs->stash->id)
        ->not
        ->toBe($mine->stash->id)
        ->and(Stash::count())
        ->toBe(2);
});

test('text becomes a note and a color a color, without a pipeline', function (
    string $input,
    StashType $type,
    string $body,
) {
    $stash = $this->capture->capture($this->user, new CapturePayload(input: $input))->stash->fresh();

    expect($stash->type)
        ->toBe($type)
        ->and($stash->body)
        ->toBe($body)
        ->and($stash->url)
        ->toBeNull()
        ->and($stash->url_hash)
        ->toBeNull();

    Queue::assertNotPushed(ExtractContent::class);
    Queue::assertPushed(IndexStash::class, fn (IndexStash $job): bool => $job->stashId === $stash->id);
})->with([
    'note' => ['remember to call mum', StashType::Note, 'remember to call mum'],
    'color' => ['#E63946', StashType::Color, '#e63946'],
]);

test('an image url becomes an image stash that extraction fills in', function () {
    $stash = $this
        ->capture->capture($this->user, new CapturePayload(input: 'https://cdn.example.com/cat.jpg'))
        ->stash->fresh();

    expect($stash->type)
        ->toBe(StashType::Image)
        ->and($stash->url)
        ->toBe('https://cdn.example.com/cat.jpg')
        ->and($stash->url_hash)
        ->not->toBeNull();

    Queue::assertPushed(ExtractContent::class);
});

test('an uploaded image is stored as the original and extraction starts', function () {
    $bytes = Images::make('png', width: 300, height: 200);
    $upload = UploadedFile::fake()->createWithContent('cat.png', $bytes);

    $stash = $this->capture->capture($this->user, new CapturePayload(image: $upload, title: 'My cat'))->stash->fresh();
    $original = $stash->files()->where('role', FileRole::Original->value)->firstOrFail();

    expect($stash->type)
        ->toBe(StashType::Image)
        ->and($stash->title)
        ->toBe('My cat')
        ->and($stash->url)
        ->toBeNull()
        ->and($original->mime)
        ->toBe('image/png')
        ->and($original->sha256)
        ->toBe(hash(algo: 'sha256', data: $bytes));

    Storage::assertExists($original->path);
    Queue::assertPushed(ExtractContent::class);
});

test('an upload that is not an accepted image saves nothing', function (string $bytes) {
    $upload = UploadedFile::fake()->createWithContent('x.png', $bytes);

    expect(fn () => $this->capture->capture($this->user, new CapturePayload(image: $upload)))
        ->toThrow(InvalidImage::class);
    expect(Stash::count())->toBe(0);

    Queue::assertNothingPushed();
})->with([
    'svg' => ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
    'text' => ['not an image'],
]);

test('tags and collections are applied, and only the owner collections', function () {
    $mine = Collection::factory()->for($this->user)->create();
    $foreign = Collection::factory()->create();

    $stash = $this->capture->capture($this->user, new CapturePayload(
        input: 'https://example.com/post',
        private: true,
        tags: ['Design', '#inspiration', 'design'],
        collectionIds: [$mine->id, $foreign->id, 99999],
    ))->stash;

    expect($stash->is_private)
        ->toBeTrue()
        ->and($stash->tags()->orderBy('name')->pluck('name')->all())
        ->toBe(['Design', 'inspiration'])
        ->and(Tag::query()->where('slug', 'design')->firstOrFail()->stashes_count)
        ->toBe(1)
        ->and($stash->collections()->pluck('collections.id')->all())
        ->toBe([$mine->id]);
});

test('nothing to capture is refused', function (?string $input) {
    expect(fn () => $this->capture->capture($this->user, new CapturePayload(input: $input)))
        ->toThrow(InvalidArgumentException::class);
    expect(Stash::count())->toBe(0);
})->with([[null], [''], ["  \n "]]);
