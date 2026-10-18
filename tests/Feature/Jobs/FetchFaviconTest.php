<?php

declare(strict_types=1);

use App\Enums\AiStatus;
use App\Enums\FileRole;
use App\Enums\StashType;
use App\Jobs\FetchFavicon;
use App\Models\Stash;
use App\Models\User;
use App\Storage\Blob;
use App\Storage\StashStorage;
use GuzzleHttp\Psr7\Response;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakeWeb;
use Tests\Support\Images;

const ICON_DNS = ['bakeclub.example' => ['93.184.216.34'], 'cdn.example' => ['93.184.216.35']];

beforeEach(function () {
    Storage::fake();
    $this->stash = Stash::factory()->create([
        'url' => 'https://bakeclub.example/post',
        'domain' => 'bakeclub.example',
        'meta' => ['icon_urls' => ['https://bakeclub.example/touch.png', 'https://cdn.example/icon.png']],
    ]);
});

function fetch_favicon(Stash $stash, ?int $userId = null): void
{
    dispatch_sync(new FetchFavicon($stash->id, $userId ?? $stash->user_id));
}

function missing(): Response
{
    return new Response(404);
}

test('the first icon the page declares is kept small, with the stash', function () {
    $web = FakeWeb::install(ICON_DNS, [FakeWeb::image(Images::make('png', 180, 180))]);

    fetch_favicon($this->stash);

    $favicon = $this->stash->fresh()->favicon;

    expect($web->urls())
        ->toBe(['https://bakeclub.example/touch.png'])
        ->and($favicon->mime)
        ->toBe('image/webp')
        ->and($favicon->width)
        ->toBe(64)
        ->and($favicon->role)
        ->toBe(FileRole::Favicon);
    Storage::assertExists($favicon->path);
});

test('the next address is tried when one has no icon, or one that is no picture', function () {
    $this->stash->forceFill([
        'meta' => ['icon_urls' => [
            'https://bakeclub.example/gone.png',
            'https://bakeclub.example/vector',
            'https://cdn.example/icon.png',
        ]],
    ])->save();
    $web = FakeWeb::install(ICON_DNS, [
        missing(),
        FakeWeb::image('<svg xmlns="http://www.w3.org/2000/svg"/>', 'image/svg+xml'),
        FakeWeb::image(Images::make('png', 32, 32)),
    ]);

    fetch_favicon($this->stash);

    expect($web->requestCount())->toBe(3)->and($this->stash->fresh()->favicon?->width)->toBe(32);
});

test('a page that declared nothing is asked at the place every browser looks in, and an .ico is read', function () {
    $this->stash->forceFill(['meta' => null])->save();
    $web = FakeWeb::install(ICON_DNS, [FakeWeb::image(Images::ico(16, 32), 'image/x-icon')]);

    fetch_favicon($this->stash);

    expect($web->urls())
        ->toBe(['https://bakeclub.example/favicon.ico'])
        ->and($this->stash->fresh()->favicon?->width)
        ->toBe(
            32,
        );
});

test('the address a client saw comes after the ones the page declared, and before the default place', function () {
    $this->stash->forceFill(['meta' => ['favicon_url' => 'https://cdn.example/seen.png']])->save();
    $web = FakeWeb::install(ICON_DNS, [missing(), missing()]);

    fetch_favicon($this->stash);

    expect($web->urls())->toBe(['https://cdn.example/seen.png', 'https://bakeclub.example/favicon.ico']);
});

test('a site without an icon leaves the stash as it was', function () {
    $before = $this->stash->fresh();
    $web = FakeWeb::install(ICON_DNS, [missing(), missing(), missing()]);

    fetch_favicon($this->stash);

    expect($web->requestCount())
        ->toBe(3)
        ->and($this->stash->fresh()->favicon)
        ->toBeNull()
        ->and($this->stash->fresh()->ai_status)
        ->toBe($before->ai_status)
        ->and($this->stash->fresh()->updated_at->equalTo($before->updated_at))
        ->toBeTrue();
});

test('only a few addresses are tried', function () {
    $this->stash->forceFill(['meta' => ['icon_urls' => array_map(
        static fn (int $number): string => "https://cdn.example/{$number}.png",
        range(1, 6),
    )]])->save();
    $web = FakeWeb::install(ICON_DNS, array_fill(0, 6, missing()));

    fetch_favicon($this->stash);

    expect($web->requestCount())->toBe(4);
});

test('an address inside the network is never asked for', function () {
    $this->stash->forceFill([
        'meta' => ['icon_urls' => ['http://127.0.0.1/icon.png', 'http://10.0.0.5/icon.png']],
    ])->save();
    $web = FakeWeb::install(ICON_DNS, [FakeWeb::image(Images::make('png', 16, 16))]);

    fetch_favicon($this->stash);

    expect($web->urls())
        ->toBe(['https://bakeclub.example/favicon.ico'])
        ->and($this->stash->fresh()->favicon)
        ->not->toBeNull();
});

test('a stash that has its icon is not asked again', function () {
    app(StashStorage::class)->store($this->stash, FileRole::Favicon, new Blob('icon', 'image/webp', 16, 16));
    $web = FakeWeb::install(ICON_DNS, []);

    fetch_favicon($this->stash);

    expect($web->requestCount())->toBe(0);
});

test('only a link has the icon of a site', function (callable $make) {
    $web = FakeWeb::install(ICON_DNS, [FakeWeb::image(Images::make('png', 16, 16))]);

    fetch_favicon($make());

    expect($web->requestCount())->toBe(0);
})->with([
    'a note' => [fn () => Stash::factory()->note()->create()],
    'an image' => [fn () => Stash::factory()->create(['type' => StashType::Image, 'domain' => 'bakeclub.example'])],
]);

test('the stash of another person is not touched', function () {
    $web = FakeWeb::install(ICON_DNS, [FakeWeb::image(Images::make('png', 16, 16))]);

    fetch_favicon($this->stash, userId: User::factory()->create()->id);

    expect($web->requestCount())->toBe(0)->and($this->stash->fresh()->favicon)->toBeNull();
});

test('an error of our own is reported and does not stop the chain the job sits in', function () {
    Exceptions::fake();
    $this->stash->forceFill(['ai_status' => AiStatus::Pending])->save();
    FakeWeb::install(ICON_DNS, []);

    fetch_favicon($this->stash);

    Exceptions::assertReportedCount(1);
    expect($this->stash->fresh()->ai_status)->toBe(AiStatus::Pending);
});

test('a stash that another run is busy with goes without an icon instead of holding the chain up', function () {
    expect(new FetchFavicon(1, 1)->middleware()[0]->releaseAfter)->toBeNull();
});
