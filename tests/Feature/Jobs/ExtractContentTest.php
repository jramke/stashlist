<?php

declare(strict_types=1);

use App\Enums\AiStage;
use App\Enums\AiStatus;
use App\Enums\FileRole;
use App\Enums\StashType;
use App\Extraction\ContentExtractor;
use App\Extraction\ExtractionRecorder;
use App\Jobs\ExtractContent;
use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Storage\Blob;
use App\Storage\StashStorage;
use GuzzleHttp\Psr7\Response;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakeWeb;
use Tests\Support\Images;

const PAGE_URL = 'https://bakeclub.example/posts/starter';

const DNS = [
    'bakeclub.example' => ['93.184.216.34'],
    'cdn.example' => ['93.184.216.35'],
    'internal.example' => ['10.0.0.5'],
];

beforeEach(function () {
    Storage::fake();
});

function link_stash(string $url = PAGE_URL): Stash
{
    return Stash::factory()->create(['url' => $url, 'domain' => parse_url($url, PHP_URL_HOST)]);
}

function article_hash(): string
{
    return hash(
        algo: 'sha256',
        data: (string)file_get_contents(dirname(__DIR__, levels: 2).'/fixtures/pages/article.html'),
    );
}

test('a page is read and its image is stored as thumbnails and preview', function () {
    $stash = link_stash();
    $web = FakeWeb::install(DNS, [
        FakeWeb::html('article'),
        FakeWeb::image(Images::make('png', width: 800, height: 600, left: 'red', right: 'blue')),
    ]);

    dispatch(new ExtractContent($stash->id, $stash->user_id));

    $enrichment = StashEnrichment::findOrFail($stash->id);
    $fresh = $stash->fresh();

    expect($web->urls())
        ->toBe([PAGE_URL, 'https://bakeclub.example/img/starter.jpg'])
        ->and($enrichment->title)
        ->toBe('How to raise a sourdough starter')
        ->and($enrichment->description)
        ->toStartWith('A week-long guide')
        ->and($enrichment->extracted_text)
        ->toContain('living culture of wild yeast')
        ->and($enrichment->extract_hash)
        ->toBe(article_hash())
        ->and($enrichment->extracted_at)
        ->not
        ->toBeNull()
        ->and(array_column((array)$enrichment->colors, 'hex'))
        ->toContain('#ff0000')
        // Filed under names for the color filter.
        ->and($enrichment->color_names)
        ->toEqualCanonicalizing(['red', 'blue'])
        ->and($fresh->type)
        ->toBe(StashType::Link)
        ->and($fresh->subtype)
        ->toBe('article')
        ->and($fresh->meta)
        ->toBe([
            'site_name' => 'Bake Club',
            'favicon_url' => 'https://bakeclub.example/static/favicon.png',
            'lang' => 'en',
        ])
        ->and(
            $stash
                ->files()
                ->pluck('role')
                ->map(static fn (FileRole $role): string => $role->value)
                ->sort()
                ->values()
                ->all(),
        )
        ->toBe(['og', 'preview', 'thumb', 'thumb_small']);

    foreach ($stash->files as $file) {
        Storage::assertExists($file->path);
    }
});

test('a url that serves an image becomes an image stash', function () {
    $stash = link_stash('https://cdn.example/cat');
    FakeWeb::install(DNS, [FakeWeb::image(Images::make('jpeg', width: 1200, height: 800), 'image/jpeg')]);

    dispatch(new ExtractContent($stash->id, $stash->user_id));

    $fresh = $stash->fresh();

    expect($fresh->type)
        ->toBe(StashType::Image)
        ->and($fresh->meta)
        ->toMatchArray(['width' => 1200, 'height' => 800, 'mime' => 'image/jpeg'])
        ->and(
            $stash
                ->files()
                ->pluck('role')
                ->map(static fn (FileRole $role): string => $role->value)
                ->sort()
                ->values()
                ->all(),
        )
        ->toBe(['original', 'preview', 'thumb', 'thumb_small'])
        ->and(StashEnrichment::findOrFail($stash->id)->colors)
        ->not->toBeEmpty();
});

test('unchanged content is skipped and force extracts again', function () {
    $stash = link_stash();
    $png = Images::make('png', width: 400, height: 300);
    $web = FakeWeb::install(DNS, [
        FakeWeb::html('article'),
        FakeWeb::image($png),
        FakeWeb::html('article'),
        FakeWeb::html('article'),
        FakeWeb::image($png),
    ]);

    dispatch(new ExtractContent($stash->id, $stash->user_id));
    expect($web->requestCount())->toBe(2);

    dispatch(new ExtractContent($stash->id, $stash->user_id));
    expect($web->requestCount())->toBe(3)->and($stash->files()->count())->toBe(3);

    dispatch(ExtractContent::forced($stash->id, $stash->user_id));
    expect($web->requestCount())->toBe(5)->and(StashEnrichment::count())->toBe(1);
});

test('a page whose image cannot be used still gets its text', function (Response $imageResponse) {
    $stash = link_stash();
    FakeWeb::install(DNS, [FakeWeb::html('article'), $imageResponse]);

    dispatch(new ExtractContent($stash->id, $stash->user_id));

    expect(StashEnrichment::findOrFail($stash->id)->title)
        ->toBe('How to raise a sourdough starter')
        ->and($stash->files()->count())
        ->toBe(0)
        ->and($stash->fresh()->ai_status)
        ->not->toBe(AiStatus::Failed);
})->with([
    'not found' => [fn () => new Response(404, ['Content-Type' => 'text/html'], 'gone')],
    'not an image' => [fn () => new Response(200, ['Content-Type' => 'image/png'], 'this is not a png')],
    'wrong type' => [fn () => new Response(200, ['Content-Type' => 'text/html'], '<html></html>')],
]);

test('an uploaded image gets derivatives without any request', function () {
    $stash = Stash::factory()->create([
        'type' => StashType::Image,
        'url' => null,
        'url_hash' => null,
        'domain' => null,
    ]);
    app(StashStorage::class)->store(
        $stash,
        FileRole::Original,
        new Blob(Images::make('png', width: 900, height: 600), 'image/png', 900, 600),
    );
    $web = FakeWeb::install(DNS, []);

    dispatch(new ExtractContent($stash->id, $stash->user_id));

    expect($web->requestCount())
        ->toBe(0)
        ->and($stash->files()->count())
        ->toBe(4)
        ->and($stash->fresh()->meta)
        ->toMatchArray(['width' => 900, 'height' => 600, 'mime' => 'image/png']);
});

test('notes and colors have nothing to extract', function (StashType $type) {
    $stash = Stash::factory()->create([
        'type' => $type,
        'url' => null,
        'url_hash' => null,
        'domain' => null,
        'body' => '#e63946',
    ]);
    $web = FakeWeb::install(DNS, []);

    dispatch(new ExtractContent($stash->id, $stash->user_id));

    expect($web->requestCount())->toBe(0)->and(StashEnrichment::count())->toBe(0);
})->with([StashType::Note, StashType::Color]);

test('permanent failures mark the stash and keep it', function (Response|string $outcome, string $reason) {
    $stash = link_stash($outcome === 'blocked' ? 'https://internal.example/admin' : PAGE_URL);
    $web = FakeWeb::install(DNS, $outcome instanceof Response ? [$outcome] : []);

    dispatch(new ExtractContent($stash->id, $stash->user_id));

    $fresh = $stash->fresh();

    expect($fresh->ai_status)
        ->toBe(AiStatus::Failed)
        ->and($fresh->ai_stage)
        ->toBe(AiStage::Extract)
        ->and($fresh->ai_error)
        ->toBe($reason)
        ->and(StashEnrichment::count())
        ->toBe(0);

    if ($outcome === 'blocked') {
        expect($web->requestCount())->toBe(0);
    }
})->with([
    'page is gone' => [fn () => new Response(404, ['Content-Type' => 'text/html'], 'nope'), 'fetch_gone'],
    'host is private' => ['blocked', 'fetch_blocked'],
    'unsupported type' => [
        fn () => new Response(200, ['Content-Type' => 'application/pdf'], '%PDF'),
        'unsupported_type',
    ],
    'text served as image' => [
        fn () => new Response(200, ['Content-Type' => 'image/png'], 'not a png'),
        'unsupported_type',
    ],
    'corrupt png' => [
        fn () => new Response(
            200,
            ['Content-Type' => 'image/png'],
            // A real PNG signature and header, but no image data.
            substr(Images::make('png', width: 100, height: 100), offset: 0, length: 33).str_repeat('x', times: 100),
        ),
        'image_unreadable',
    ],
]);

test('a server error is tried again later, not marked as failed', function () {
    $stash = link_stash();
    FakeWeb::install(DNS, [new Response(503, ['Content-Type' => 'text/html'], 'busy')]);

    $job = new ExtractContent($stash->id, $stash->user_id)->withFakeQueueInteractions();
    $job->handle(app(ContentExtractor::class), app(ExtractionRecorder::class));

    $job->assertReleased(30);

    expect($stash->fresh()->ai_status)->not->toBe(AiStatus::Failed);
});

test('a stash that vanished or belongs to someone else is ignored', function () {
    $stash = link_stash();
    $other = Stash::factory()->create();
    $web = FakeWeb::install(DNS, []);

    dispatch(new ExtractContent($stash->id + 1000, $stash->user_id));
    dispatch(new ExtractContent($stash->id, $other->user_id));

    expect($web->requestCount())->toBe(0)->and(StashEnrichment::count())->toBe(0);
});
