<?php

declare(strict_types=1);

use App\Enums\FileRole;
use App\Jobs\DeriveCapturedImage;
use App\Jobs\ExtractContent;
use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Storage\Blob;
use App\Storage\StashStorage;
use GuzzleHttp\Psr7\Response;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakeWeb;
use Tests\Support\Images;

const CAPTURE_DNS = ['cdn.example' => ['93.184.216.35'], 'bakeclub.example' => ['93.184.216.34']];

beforeEach(function () {
    Storage::fake();
    $this->stash = Stash::factory()->create(['url' => 'https://bakeclub.example/post', 'domain' => 'bakeclub.example']);
});

function derive(Stash $stash): void
{
    dispatch_sync(new DeriveCapturedImage($stash->id, $stash->user_id));
}

function stored_roles(Stash $stash): array
{
    return $stash
        ->files()
        ->pluck('role')
        ->map(fn ($role) => $role->value)
        ->sort()
        ->values()
        ->all();
}

test('the picture the client sent becomes thumbnails and preview, and its colors are noted', function () {
    $web = FakeWeb::install(CAPTURE_DNS, []);
    app(StashStorage::class)->store(
        $this->stash,
        FileRole::Og,
        new Blob(Images::make('png', 800, 600, 'red', 'blue'), 'image/png'),
    );

    derive($this->stash);

    expect(stored_roles($this->stash))
        ->toBe(['og', 'preview', 'thumb', 'thumb_small'])
        ->and(array_column((array)StashEnrichment::query()->findOrFail($this->stash->id)->colors, 'hex'))
        ->toContain('#ff0000')
        // The color filter and the search read the names.
        ->and(StashEnrichment::query()->findOrFail($this->stash->id)->color_names)
        ->toContain('red', 'blue')
        ->and($web->requestCount())
        ->toBe(0);
});

test('a screenshot is used when there is no picture', function () {
    FakeWeb::install(CAPTURE_DNS, []);
    app(StashStorage::class)->store(
        $this->stash,
        FileRole::Screenshot,
        new Blob(Images::make('png', 400, 300), 'image/png'),
    );

    derive($this->stash);

    expect(stored_roles($this->stash))->toBe(['preview', 'screenshot', 'thumb']);
});

test('an address is fetched the safe way and kept as the page picture', function () {
    $web = FakeWeb::install(CAPTURE_DNS, [FakeWeb::image(Images::make('png', 640, 480))]);
    $this->stash->forceFill(['meta' => ['image_url' => 'https://cdn.example/og.png']])->save();

    derive($this->stash);

    expect($web->urls())
        ->toBe(['https://cdn.example/og.png'])
        ->and(stored_roles($this->stash))
        ->toBe(['og', 'preview', 'thumb', 'thumb_small']);
});

test('an address that cannot be used leaves the stash without a picture and not failed', function (
    array $dns,
    array $responses,
) {
    FakeWeb::install($dns, $responses);
    $this->stash->forceFill(['meta' => ['image_url' => 'https://cdn.example/og.png']])->save();

    derive($this->stash);

    expect(stored_roles($this->stash))->toBeEmpty()->and($this->stash->fresh()->ai_status->value)->not->toBe('failed');
})->with([
    'a private address' => [['cdn.example' => ['10.0.0.5']], []],
    'a missing file' => [CAPTURE_DNS, [new Response(404)]],
    'something that is no image' => [CAPTURE_DNS, [new Response(200, ['Content-Type' => 'image/png'], 'not an image')]],
]);

test('bytes that are no image end quietly', function () {
    FakeWeb::install(CAPTURE_DNS, []);
    app(StashStorage::class)->store($this->stash, FileRole::Og, new Blob('GIF89a-but-broken', 'image/gif'));

    derive($this->stash);

    expect(stored_roles($this->stash))->toBe(['og']);
});

test('a stash deleted meanwhile is left alone', function () {
    FakeWeb::install(CAPTURE_DNS, []);
    $id = $this->stash->id;
    $userId = $this->stash->user_id;
    $this->stash->delete();

    dispatch_sync(new DeriveCapturedImage($id, $userId));

    expect(Stash::withoutGlobalScopes()->find($id))->toBeNull();
});

test('the server does not fetch the page picture when the client sent one', function () {
    $web = FakeWeb::install(CAPTURE_DNS, [FakeWeb::html('article')]);
    $this->stash->forceFill(['meta' => ['client_picture' => true]])->save();

    dispatch_sync(new ExtractContent($this->stash->id, $this->stash->user_id));

    expect($web->urls())->toBe(['https://bakeclub.example/post'])->and(stored_roles($this->stash))->toBeEmpty();
});

test('the page picture is not fetched when the address the client named already gave one, and its colors stay', function () {
    $web = FakeWeb::install(CAPTURE_DNS, [
        FakeWeb::image(Images::make('png', 800, 600, 'red', 'blue')),
        FakeWeb::html('article'),
    ]);
    $this->stash->forceFill(['meta' => ['image_url' => 'https://cdn.example/clicked.png']])->save();

    derive($this->stash);
    dispatch_sync(new ExtractContent($this->stash->id, $this->stash->user_id));

    expect($web->urls())
        ->toBe(['https://cdn.example/clicked.png', 'https://bakeclub.example/post'])
        ->and(array_column((array)StashEnrichment::query()->findOrFail($this->stash->id)->colors, 'hex'))
        ->toContain('#ff0000');
});

test('the page picture is the fallback when the address the client named gave nothing', function () {
    $web = FakeWeb::install(CAPTURE_DNS, [
        new Response(404),
        FakeWeb::html('article'),
        FakeWeb::image(Images::make('png', 640, 480)),
    ]);
    $this->stash->forceFill(['meta' => ['image_url' => 'https://cdn.example/clicked.png']])->save();

    derive($this->stash);
    dispatch_sync(new ExtractContent($this->stash->id, $this->stash->user_id));

    expect($web->urls())
        ->toBe([
            'https://cdn.example/clicked.png',
            'https://bakeclub.example/post',
            'https://bakeclub.example/img/starter.jpg',
        ])
        ->and(stored_roles($this->stash))
        ->toContain('og', 'thumb');
});

test('the page picture by its address wins over a screenshot, which the extension sends with it', function () {
    $web = FakeWeb::install(CAPTURE_DNS, [FakeWeb::image(Images::make('png', 800, 600, 'red', 'blue'))]);
    $this->stash->forceFill(['meta' => ['image_url' => 'https://cdn.example/og.png']])->save();
    app(StashStorage::class)->store(
        $this->stash,
        FileRole::Screenshot,
        new Blob(Images::make('png', 400, 300, 'green'), 'image/png'),
    );

    derive($this->stash);

    expect($web->urls())
        ->toBe(['https://cdn.example/og.png'])
        ->and(stored_roles($this->stash))
        ->toBe(['og', 'preview', 'screenshot', 'thumb', 'thumb_small'])
        ->and(array_column((array)StashEnrichment::query()->findOrFail($this->stash->id)->colors, 'hex'))
        ->toContain('#ff0000')
        ->not->toContain('#008000');
});

test('the screenshot is used when the page picture cannot be had or is not a picture', function (Response $answer) {
    FakeWeb::install(CAPTURE_DNS, [$answer]);
    $this->stash->forceFill(['meta' => ['image_url' => 'https://cdn.example/og.png']])->save();
    app(StashStorage::class)->store(
        $this->stash,
        FileRole::Screenshot,
        new Blob(Images::make('png', 400, 300, 'green'), 'image/png'),
    );

    derive($this->stash);

    expect(stored_roles($this->stash))
        ->toBe(['preview', 'screenshot', 'thumb'])
        ->and(array_column((array)StashEnrichment::query()->findOrFail($this->stash->id)->colors, 'hex'))
        ->toContain('#008000');
})->with([
    'gone' => [fn () => new Response(404, ['Content-Type' => 'text/html'], 'gone')],
    'not a picture' => [fn () => new Response(200, ['Content-Type' => 'image/png'], 'this is not a png')],
]);
