<?php

declare(strict_types=1);

use App\Enums\AiStatus;
use App\Enums\FileRole;
use App\Enums\StashType;
use App\Models\Collection;
use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Models\User;
use App\Storage\Blob;
use App\Storage\StashStorage;
use App\Tags\TagSync;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    Storage::fake();

    $this->user = User::factory()->create();
});

function titles(AssertableInertia $page): array
{
    return array_column($page->toArray()['props']['stashes']['data'], 'title');
}

test('guests are sent to the login page', function () {
    $this->get('/stashes')->assertRedirect('/login');
});

test('the home page sends signed-in users to their feed and shows the front page to guests', function () {
    $this->get('/')->assertInertia(fn (AssertableInertia $page) => $page->component('marketing/home'));
    $this->actingAs($this->user)->get('/')->assertRedirect(route('stashes.index'));
});

test('the feed lists only my stashes, newest first', function () {
    $this->travelTo(now()->subDays(2));
    Stash::factory()->for($this->user)->create(['title' => 'Oldest']);
    $this->travelTo(now()->addDay());
    Stash::factory()->for($this->user)->create(['title' => 'Newest']);
    Stash::factory()->create(['title' => 'Somebody else']);

    $this
        ->actingAs($this->user)
        ->get('/stashes')
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('stashes/index')
                ->has('stashes.data', 2)
                ->where('stashes.data.0.title', 'Newest')
                ->where('stashes.data.1.title', 'Oldest'),
        );
});

test('a card carries what the grid needs', function () {
    $stash = Stash::factory()->for($this->user)->create([
        'title' => null,
        'url' => 'https://example.com/post',
        'domain' => 'example.com',
        'subtype' => 'article',
    ]);
    StashEnrichment::query()->create([
        'stash_id' => $stash->id,
        'user_id' => $this->user->id,
        'title' => 'Scraped title',
        'description' => 'Scraped description',
        'colors' => [['hex' => '#ff0000', 'pct' => 0.6]],
        'extracted_at' => now(),
    ]);
    app(StashStorage::class)->store($stash, FileRole::Thumb, new Blob('thumb', 'image/webp', width: 640, height: 480));
    app(TagSync::class)->addByUser($stash, 'Design');

    $this
        ->actingAs($this->user)
        ->get('/stashes')
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->where('stashes.data.0.id', $stash->id)
                ->where('stashes.data.0.type', 'link')
                ->where('stashes.data.0.subtype', 'article')
                ->where('stashes.data.0.title', 'Scraped title')
                ->where('stashes.data.0.description', 'Scraped description')
                ->where('stashes.data.0.url', 'https://example.com/post')
                ->where('stashes.data.0.domain', 'example.com')
                ->where('stashes.data.0.ai_status', 'pending')
                ->where('stashes.data.0.fetching', false)
                ->where('stashes.data.0.colors', [['hex' => '#ff0000', 'pct' => 0.6]])
                ->where('stashes.data.0.thumbnail.width', 640)
                ->where('stashes.data.0.thumbnail.height', 480)
                ->where('stashes.data.0.tags.0.name', 'Design')
                ->where('stashes.data.0.tags.0.source', 'user')
                ->has('stashes.data.0.thumbnail.url')
                ->has('stashes.data.0.created_at')
                ->missing('stashes.data.0.user_id')
                ->missing('stashes.data.0.url_hash'),
        );
});

test('the title falls back from my title to the scraped one to the domain, and a note has none', function () {
    Stash::factory()->for($this->user)->create(['title' => 'Mine', 'domain' => 'a.example']);
    $scraped = Stash::factory()->for($this->user)->create(['title' => null, 'domain' => 'b.example']);
    StashEnrichment::query()->create(['stash_id' => $scraped->id, 'user_id' => $this->user->id, 'title' => 'Scraped']);
    Stash::factory()->for($this->user)->create(['title' => null, 'domain' => 'c.example']);
    Stash::factory()->for($this->user)->note()->create(['title' => null]);

    $this
        ->actingAs($this->user)
        ->get('/stashes')
        ->assertInertia(fn (AssertableInertia $page) => expect(titles($page))->toEqualCanonicalizing([
            'Mine',
            'Scraped',
            'c.example',
            null,
        ]));
});

test('the feed can be filtered', function (Closure $query, array $expected) {
    $link = Stash::factory()->for($this->user)->create(['title' => 'link']);
    Stash::factory()->for($this->user)->note()->create(['title' => 'note']);
    Stash::factory()->for($this->user)->create(['title' => 'failed', 'ai_status' => AiStatus::Failed]);
    $filed = Stash::factory()->for($this->user)->create(['title' => 'filed']);

    $design = app(TagSync::class)->addByUser($link, 'design');
    app(TagSync::class)->addByUser($filed, 'design');
    $inspiration = app(TagSync::class)->addByUser($filed, 'inspiration');

    $collection = Collection::factory()->for($this->user)->create();
    $filed->collections()->attach($collection->id, ['user_id' => $this->user->id, 'created_at' => now()]);

    $ids = (object)['design' => $design->id, 'inspiration' => $inspiration->id, 'collection' => $collection->id];

    $this
        ->actingAs($this->user)
        ->get('/stashes?'.http_build_query($query($ids)))
        ->assertInertia(fn (AssertableInertia $page) => expect(titles($page))->toEqualCanonicalizing($expected));
})->with([
    'by type' => [fn (object $ids): array => ['type' => 'note'], ['note']],
    'by status' => [fn (object $ids): array => ['status' => 'failed'], ['failed']],
    'by one tag' => [fn (object $ids): array => ['tag' => [$ids->design]], ['link', 'filed']],
    'by two tags (all of them)' => [fn (object $ids): array => ['tag' => [$ids->design, $ids->inspiration]], ['filed']],
    'by collection' => [fn (object $ids): array => ['collection' => $ids->collection], ['filed']],
    'in no collection' => [fn (object $ids): array => ['collection' => 'none'], ['link', 'note', 'failed']],
    'type and tag combined' => [
        fn (object $ids): array => ['type' => 'link', 'tag' => [$ids->design]],
        ['link', 'filed'],
    ],
]);

test('invalid filters are refused', function (array $query) {
    $this
        ->actingAs($this->user)
        ->get('/stashes?'.http_build_query($query))
        ->assertSessionHasErrors();
})->with([
    'unknown type' => [['type' => 'video']],
    'unknown status' => [['status' => 'weird']],
    'tag that is not a number' => [['tag' => ['abc']]],
    'collection that is not an id' => [['collection' => 'abc']],
]);

test('the feed is paginated with a cursor, sixty at a time', function () {
    Stash::factory()->count(65)->for($this->user)->create();

    $first = $this->actingAs($this->user)->get('/stashes');
    $first->assertInertia(fn (AssertableInertia $page) => $page->has('stashes.data', 60));

    $cursor = $first->viewData('page')['scrollProps']['stashes']['nextPage'] ?? null;

    expect($cursor)->not->toBeNull();

    $this
        ->actingAs($this->user)
        ->get('/stashes?cursor='.$cursor)
        ->assertInertia(fn (AssertableInertia $page) => $page->has('stashes.data', 5));
});

test('rendering a page does not run a query per card', function () {
    Stash::factory()->count(30)->for($this->user)->create();

    // Strict mode throws on lazy loading, so a page that renders at all loads its relations up front.
    $this
        ->actingAs($this->user)
        ->get('/stashes')
        ->assertInertia(fn (AssertableInertia $page) => $page->has('stashes.data', 30));
});

test('the detail page shows my stash and refuses other users', function () {
    $stash = Stash::factory()->for($this->user)->create(['title' => 'Mine']);
    $other = Stash::factory()->create();

    $this
        ->actingAs($this->user)
        ->get("/stashes/{$stash->id}")
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('stashes/show')
                ->where('detail.stash.id', $stash->id)
                ->where('detail.stash.title', 'Mine')
                ->where('detail.collection_ids', []),
        );

    $this->actingAs($this->user)->get("/stashes/{$other->id}")->assertNotFound();
});

test('the detail page needs a login', function () {
    $stash = Stash::factory()->for($this->user)->create();

    $this->get("/stashes/{$stash->id}")->assertRedirect('/login');
});

test('a note shows its text in the detail view', function () {
    $stash = Stash::factory()
        ->for($this->user)
        ->note()
        ->create(['body' => str_repeat('word ', times: 400)]);

    $this
        ->actingAs($this->user)
        ->get("/stashes/{$stash->id}")
        ->assertInertia(fn (AssertableInertia $page) => $page->where('detail.full_body', str_repeat(
            'word ',
            times: 400,
        ))->where('detail.stash.type', StashType::Note->value));
});

test('a link waits for extraction until it is read, fails, or gets old', function () {
    $waiting = Stash::factory()->for($this->user)->create(['title' => 'waiting']);
    $read = Stash::factory()->for($this->user)->create(['title' => 'read']);
    StashEnrichment::query()->create(['stash_id' => $read->id, 'user_id' => $this->user->id, 'extracted_at' => now()]);
    Stash::factory()->for($this->user)->create(['title' => 'failed', 'ai_status' => AiStatus::Failed]);
    Stash::factory()->for($this->user)->note()->create(['title' => 'note']);
    $this->travelTo(now()->subHour());
    Stash::factory()->for($this->user)->create(['title' => 'old']);
    $this->travelBack();

    $this
        ->actingAs($this->user)
        ->get('/stashes')
        ->assertInertia(function (AssertableInertia $page) {
            $fetching = collect($page->toArray()['props']['stashes']['data'])->pluck('fetching', 'title')->all();

            return expect($fetching)->toEqual([
                'waiting' => true,
                'read' => false,
                'failed' => false,
                'note' => false,
                'old' => false,
            ]);
        });
});

test('a card gets both thumbnails as an srcset, the small one first, and only the big one when there is no small one', function () {
    $both = Stash::factory()->for($this->user)->create([
        'url' => 'https://example.com/both',
        'domain' => 'example.com',
    ]);
    $one = Stash::factory()->for($this->user)->create(['url' => 'https://example.com/one', 'domain' => 'example.com']);
    $storage = app(StashStorage::class);

    $storage->store($both, FileRole::Thumb, new Blob('big', 'image/webp', width: 640, height: 480));
    $storage->store($both, FileRole::ThumbSmall, new Blob('small', 'image/webp', width: 400, height: 300));
    $storage->store($one, FileRole::Thumb, new Blob('big', 'image/webp', width: 300, height: 200));

    $this
        ->actingAs($this->user)
        ->get('/stashes')
        ->assertInertia(function (AssertableInertia $page) use ($both, $one) {
            $cards = collect($page->toArray()['props']['stashes']['data'])->keyBy('id');

            expect($cards[$both->id]['thumbnail']['srcset'])
                ->toMatch('~^\S+ 400w, \S+ 640w$~')
                ->and($cards[$one->id]['thumbnail']['srcset'])
                ->toBeNull();
        });
});
