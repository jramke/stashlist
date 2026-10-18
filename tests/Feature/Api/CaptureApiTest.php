<?php

declare(strict_types=1);

use App\Enums\StashType;
use App\Enums\TokenAbility;
use App\Jobs\DeriveCapturedImage;
use App\Jobs\ExtractContent;
use App\Jobs\FetchFavicon;
use App\Jobs\IndexStash;
use App\Models\Collection;
use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\Support\Images;

beforeEach(function () {
    Queue::fake();
    Storage::fake();

    $this->user = User::factory()->create();
    $this->token = $this->user->createToken('test', TokenAbility::values())->plainTextToken;
});

function save(array $data, #[SensitiveParameter] ?string $token = null): Illuminate\Testing\TestResponse
{
    return test()->withToken($token ?? test()->token)->postJson('/api/v1/stashes', $data);
}

test('saving needs a token with the create ability', function () {
    $this->postJson('/api/v1/stashes', ['url' => 'https://example.com'])->assertUnauthorized();

    $readOnly = $this->user->createToken('read', [TokenAbility::Read->value])->plainTextToken;
    save(['url' => 'https://example.com'], $readOnly)->assertForbidden();

    expect(Stash::count())->toBe(0);
});

test('a link is saved, extraction is queued and the answer says what was made', function () {
    $response = save(['type' => 'link', 'url' => 'https://www.Example.com/post?utm_source=x', 'tags' => ['Design']]);

    $stash = Stash::query()->sole();

    $response
        ->assertCreated()
        ->assertExactJson([
            'id' => $stash->id,
            'created' => true,
            'type' => 'link',
            'url' => 'https://www.Example.com/post?utm_source=x',
            'title' => 'example.com',
            'tags' => ['Design'],
            'web_url' => route('stashes.show', $stash),
        ]);
    expect($stash->user_id)->toBe($this->user->id)->and($stash->domain)->toBe('example.com');
    Queue::assertPushedWithChain(ExtractContent::class, [FetchFavicon::class, IndexStash::class]);
});

test('the same link again answers 200 with the stash that exists', function () {
    $first = save(['url' => 'https://example.com/post'])->assertCreated()->json('id');

    save(['url' => 'https://EXAMPLE.com/post?utm_campaign=y#top'])
        ->assertOk()
        ->assertJson(['id' => $first, 'created' => false]);

    expect(Stash::count())->toBe(1);
    Queue::assertPushed(ExtractContent::class, 1);
});

test('notes and colors are their text, even when a note looks like a link', function () {
    save(['type' => 'note', 'body' => 'https://example.com is where I read it'])
        ->assertCreated()
        ->assertJson([
            'type' => 'note',
        ]);
    save(['type' => 'color', 'body' => '#E63946'])->assertCreated()->assertJson(['type' => 'color']);
    save(['body' => 'plain text'])->assertCreated()->assertJson(['type' => 'note']);

    expect(Stash::query()->orderBy('id')->pluck('body')->all())->toBe([
        'https://example.com is where I read it',
        '#e63946',
        'plain text',
    ]);
    Queue::assertNotPushed(ExtractContent::class);
});

test('title, tags and my own collections are applied', function () {
    $mine = Collection::factory()->for($this->user)->create();

    save([
        'url' => 'https://example.com/a',
        'title' => 'My title',
        'tags' => ['one', 'Two', '   '],
        'collection_ids' => [$mine->id],
    ])->assertCreated();

    $stash = Stash::query()->with(['visibleTags', 'collections'])->sole();

    expect($stash->title)
        ->toBe('My title')
        ->and($stash->visibleTags->pluck('name')->sort()->values()->all())
        ->toBe(['Two', 'one'])
        ->and($stash->collections->pluck('id')->all())
        ->toBe([$mine->id]);
});

test('nothing to save, a bad address and a type that does not exist are refused', function (
    array $data,
    string $field,
) {
    save($data)->assertUnprocessable()->assertJsonValidationErrors($field);

    expect(Stash::count())->toBe(0);
})->with([
    'nothing' => [[], 'url'],
    'an address that is no address' => [['url' => 'not a url'], 'url'],
    'a file address' => [['url' => 'file:///etc/passwd'], 'url'],
    'a javascript address' => [['url' => 'javascript:alert(1)'], 'url'],
    'an unknown type' => [['type' => 'video', 'url' => 'https://example.com'], 'type'],
    'too many tags' => [['url' => 'https://example.com', 'tags' => array_fill(0, 51, 'x')], 'tags'],
    'a long title' => [['url' => 'https://example.com', 'title' => str_repeat('x', 501)], 'title'],
]);

test('only my own collections can be used', function () {
    $theirs = Collection::factory()->create();

    save(['url' => 'https://example.com', 'collection_ids' => [$theirs->id]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('collection_ids.0');
});

test('control characters never reach the database', function () {
    save([
        'url' => 'https://example.com/clean',
        'title' => "A\x00 ti\x07tle\nwith a line",
        'tags' => ["ta\x00g"],
        'capture' => ['content_markdown' => "text\x00 with\x1b bad bytes", 'site_name' => "Site\x00"],
    ])->assertCreated();

    $stash = Stash::query()->with(['enrichment', 'visibleTags'])->sole();

    expect($stash->title)
        ->toBe("A title\nwith a line")
        ->and($stash->visibleTags->first()->name)
        ->toBe('tag')
        ->and($stash->enrichment->extracted_text)
        ->toBe('text with bad bytes')
        ->and($stash->meta['site_name'])
        ->toBe('Site');
});

test('the page text the client sends replaces the fetch', function () {
    save([
        'url' => 'https://example.com/post',
        'title' => 'A post',
        'capture' => [
            'source' => 'extension',
            'version' => '1.0.0',
            'content_markdown' => "# A post\n\nThe text of the page.",
            'description' => 'About the post',
            'site_name' => 'Example',
            'author' => 'Ada',
            'published' => '2026-09-01',
            'language' => 'de-DE',
            'favicon_url' => 'https://example.com/favicon.png',
            'schema_org' => [['@type' => 'Article']],
        ],
    ])->assertCreated();

    $stash = Stash::query()->sole();
    $enrichment = StashEnrichment::query()->findOrFail($stash->id);

    expect($enrichment->extracted_text)
        ->toBe("# A post\n\nThe text of the page.")
        ->and($enrichment->description)
        ->toBe('About the post')
        ->and($enrichment->language)
        ->toBe('de')
        ->and($enrichment->extract_hash)
        ->toBe(hash('sha256', "# A post\n\nThe text of the page."))
        ->and($enrichment->extracted_at)
        ->not
        ->toBeNull()
        ->and($stash->meta)
        ->toBe([
            'site_name' => 'Example',
            'favicon_url' => 'https://example.com/favicon.png',
            'lang' => 'de-DE',
            'author' => 'Ada',
            'published' => '2026-09-01',
            'schema_org' => [['@type' => 'Article']],
            'captured_by' => ['source' => 'extension', 'version' => '1.0.0'],
        ]);

    Queue::assertNotPushed(ExtractContent::class);
    Queue::assertNotPushed(DeriveCapturedImage::class);
    Queue::assertPushedWithChain(FetchFavicon::class, [IndexStash::class]);
});

test('the JSON-LD the client sends says what the page is and what it costs', function () {
    save([
        'url' => 'https://shop.example/pan',
        'capture' => [
            'content_markdown' => 'A pan.',
            'schema_org' => [
                [
                    '@context' => 'https://schema.org',
                    '@graph' => [
                        ['@type' => 'WebSite'],
                        [
                            '@type' => 'Product',
                            'offers' => ['@type' => 'Offer', 'price' => '19,95', 'priceCurrency' => 'USD'],
                        ],
                    ],
                ],
            ],
        ],
    ])->assertCreated();

    $stash = Stash::query()->sole();

    expect($stash->subtype)
        ->toBe('product')
        ->and($stash->meta['price'])
        ->toBe(['amount' => '19.95', 'currency' => 'USD']);
});

test('a client that sends no JSON-LD leaves the kind to the model', function () {
    save(['url' => 'https://example.com/post', 'capture' => ['content_markdown' => 'Text.']])->assertCreated();

    $stash = Stash::query()->sole();

    expect($stash->subtype)->toBeNull()->and($stash->meta)->not->toHaveKey('price');
});

test('without the page text the server still fetches the page', function () {
    save(['url' => 'https://example.com/post', 'capture' => ['site_name' => 'Example', 'description' => 'Hi']])
        ->assertCreated();

    expect(Stash::query()->sole()->meta)
        ->toBe(['site_name' => 'Example']);
    expect(StashEnrichment::query()->count())->toBe(0);
    Queue::assertPushedWithChain(ExtractContent::class, [FetchFavicon::class, IndexStash::class]);
});

test('an image address from the client is fetched by a job, before nothing else', function () {
    save([
        'url' => 'https://example.com/post',
        'capture' => ['content_markdown' => 'text', 'image_url' => 'https://example.com/og.jpg'],
    ])->assertCreated();

    Queue::assertPushedWithChain(DeriveCapturedImage::class, [FetchFavicon::class, IndexStash::class]);
    Queue::assertNotPushed(ExtractContent::class);
    expect(Stash::query()->sole()->meta['image_url'])->toBe('https://example.com/og.jpg');
});

test('picture bytes from the client are stored and win over the address', function () {
    $png = Images::make('png', width: 400, height: 300);

    $this
        ->withToken($this->token)
        ->post(
            '/api/v1/stashes',
            [
                'url' => 'https://example.com/post',
                'capture' => ['content_markdown' => 'text', 'image_url' => 'https://example.com/og.jpg'],
                'image' => UploadedFile::fake()->createWithContent('og.png', $png),
                'screenshot' => UploadedFile::fake()->createWithContent('shot.png', Images::make('png', 200, 100)),
            ],
            ['Accept' => 'application/json'],
        )
        ->assertCreated()
        ->assertJson(['type' => 'link']);

    $stash = Stash::query()->with('files')->sole();

    expect(
        $stash
            ->files
            ->pluck('role')
            ->map(fn ($role) => $role->value)
            ->sort()
            ->values()
            ->all(),
    )
        ->toBe(['og', 'screenshot'])
        ->and($stash->meta['client_picture'])
        ->toBeTrue();
    Queue::assertPushedWithChain(DeriveCapturedImage::class, [FetchFavicon::class, IndexStash::class]);
});

test('a file that is no image is refused', function (string $field, string $bytes) {
    $this
        ->withToken($this->token)
        ->post(
            '/api/v1/stashes',
            ['url' => 'https://example.com/post', $field => UploadedFile::fake()->createWithContent('x.png', $bytes)],
            ['Accept' => 'application/json'],
        )
        ->assertUnprocessable();

    expect(Stash::count())->toBe(0);
})->with([
    'svg as image' => ['image', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
    'text as screenshot' => ['screenshot', 'not an image'],
]);

test('an image alone is an image stash', function () {
    $this
        ->withToken($this->token)
        ->post(
            '/api/v1/stashes',
            [
                'title' => 'A cat',
                'image' => UploadedFile::fake()->createWithContent('cat.png', Images::make('png', 300, 200)),
            ],
            ['Accept' => 'application/json'],
        )
        ->assertCreated()
        ->assertJson(['type' => 'image', 'title' => 'A cat']);

    expect(Stash::query()->sole()->type)->toBe(StashType::Image);
    Queue::assertPushedWithChain(ExtractContent::class, [IndexStash::class]);
});

test('an image keeps the page it was on as its source', function () {
    $this
        ->withToken($this->token)
        ->post(
            '/api/v1/stashes',
            [
                'title' => 'A cat on a wall',
                'source_url' => 'https://blog.example/cats',
                'image' => UploadedFile::fake()->createWithContent('cat.png', Images::make('png', 300, 200)),
            ],
            ['Accept' => 'application/json'],
        )
        ->assertCreated()
        ->assertJson(['type' => 'image', 'title' => 'A cat on a wall', 'url' => null]);

    expect(Stash::query()->sole()->meta)->toBe(['source_url' => 'https://blog.example/cats']);
});

test('an image saved by its own address keeps the page too', function () {
    save([
        'type' => 'image',
        'url' => 'https://cdn.example/cat.jpg',
        'source_url' => 'https://blog.example/cats',
    ])
        ->assertCreated()
        ->assertJson(['type' => 'image', 'url' => 'https://cdn.example/cat.jpg']);

    expect(Stash::query()->sole()->meta)->toBe(['source_url' => 'https://blog.example/cats']);
});

test('only an image has a source: a link is its own address', function () {
    save(['url' => 'https://example.com/post', 'source_url' => 'https://blog.example/cats'])->assertCreated();

    expect(Stash::query()->sole()->meta)->toBeNull();
});

test('the source of a picture is a web address', function (string $source) {
    $this
        ->withToken($this->token)
        ->post(
            '/api/v1/stashes',
            [
                'source_url' => $source,
                'image' => UploadedFile::fake()->createWithContent('cat.png', Images::make('png', 300, 200)),
            ],
            ['Accept' => 'application/json'],
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors('source_url');

    expect(Stash::count())->toBe(0);
})->with([
    'a script' => 'javascript:alert(1)',
    'a file' => 'file:///etc/passwd',
    'too long' => 'https://x.example/'.str_repeat('a', 2100),
]);

test('the sizes of what a client may send are capped', function () {
    $tooLong = str_repeat('x', 200_001);

    save(['url' => 'https://example.com/a', 'capture' => ['content_markdown' => $tooLong]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('capture.content_markdown');
    save(['url' => 'https://example.com/a', 'capture' => ['schema_org' => [str_repeat('x', 60_000)]]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('capture.schema_org');

    $this
        ->withToken($this->token)
        ->postJson('/api/v1/stashes', ['url' => 'https://example.com/a', 'body' => str_repeat('x', 1_100_000)])
        ->assertStatus(413);

    expect(Stash::count())->toBe(0);
});

test('stored page text is cut at 100 KB', function () {
    save(['url' => 'https://example.com/long', 'capture' => ['content_markdown' => str_repeat('a', 150_000)]])
        ->assertCreated();

    expect(strlen(StashEnrichment::query()->sole()->extracted_text))->toBe(100_000);
});

test('saving is limited per token', function () {
    config(['stashlist.api.creates_per_minute' => 2]);

    save(['body' => 'one'])->assertCreated();
    save(['body' => 'two'])->assertCreated();
    save(['body' => 'three'])->assertTooManyRequests();

    expect(Stash::count())->toBe(2);
});

test('repeating a request with the same Idempotency-Key saves once and replays the answer', function () {
    $headers = ['Idempotency-Key' => 'clip-2026-10-10-a'];

    $first = $this->withToken($this->token)->postJson('/api/v1/stashes', ['body' => 'remember this'], $headers);
    $second = $this->withToken($this->token)->postJson('/api/v1/stashes', ['body' => 'remember this'], $headers);

    $first->assertCreated();
    $second->assertCreated()->assertHeader('Idempotent-Replayed', 'true');
    expect($second->json())->toBe($first->json())->and(Stash::count())->toBe(1);
});

test('the same key for another request is refused, and a failed request does not use up its key', function () {
    $headers = ['Idempotency-Key' => 'abc'];

    $this->withToken($this->token)->postJson('/api/v1/stashes', ['body' => ''], $headers)->assertUnprocessable();
    $this->withToken($this->token)->postJson('/api/v1/stashes', ['body' => 'now it works'], $headers)->assertCreated();
    $this
        ->withToken($this->token)
        ->postJson('/api/v1/stashes', ['body' => 'something else'], $headers)
        ->assertUnprocessable()
        ->assertJson(['message' => 'This Idempotency-Key was used for a different request.']);

    expect(Stash::count())->toBe(1);
});

test('a key is private to its token and has to be well formed', function () {
    $other = $this->user->createToken('other', TokenAbility::values())->plainTextToken;
    $headers = ['Idempotency-Key' => 'shared-key'];

    $this->withToken($this->token)->postJson('/api/v1/stashes', ['body' => 'a note'], $headers)->assertCreated();
    app('auth')->forgetGuards();
    $this->withToken($other)->postJson('/api/v1/stashes', ['body' => 'a note'], $headers)->assertCreated();

    expect(Stash::count())->toBe(2);

    app('auth')->forgetGuards();
    $this
        ->withToken($this->token)
        ->postJson('/api/v1/stashes', ['body' => 'x'], ['Idempotency-Key' => 'bad key with spaces'])
        ->assertUnprocessable();
});
