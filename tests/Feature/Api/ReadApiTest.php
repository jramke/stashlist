<?php

declare(strict_types=1);

use App\Enums\TokenAbility;
use App\Models\Collection;
use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Models\Tag;
use App\Models\User;
use App\Support\UrlNormalizer;
use App\Tags\TagSync;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->token = $this->user->createToken('test', TokenAbility::values())->plainTextToken;
});

function link_for(User $user, string $url, ?string $title = null): Stash
{
    return Stash::factory()
        ->for($user)
        ->create([
            'url' => $url,
            'url_hash' => UrlNormalizer::hash((string)UrlNormalizer::normalize($url)),
            'domain' => parse_url($url, PHP_URL_HOST),
            'title' => $title,
        ]);
}

test('lookup tells whether a link is saved, however the address is written', function () {
    $stash = link_for($this->user, 'https://www.example.com/post', 'My post');
    app(TagSync::class)->addByUser($stash, 'Design');

    $this
        ->withToken($this->token)
        ->getJson('/api/v1/stashes/lookup?url='.urlencode('https://WWW.example.com/post?utm_source=x#top'))
        ->assertOk()
        ->assertExactJson(['saved' => true, 'id' => $stash->id, 'title' => 'My post', 'tags' => ['Design']]);

    $this
        ->withToken($this->token)
        ->getJson('/api/v1/stashes/lookup?url='.urlencode('https://example.com/other'))
        ->assertOk()
        ->assertExactJson(['saved' => false, 'id' => null, 'title' => null, 'tags' => []]);
});

test('lookup falls back to the scraped title and answers not saved for things that are no address', function () {
    $stash = link_for($this->user, 'https://example.com/scraped');
    StashEnrichment::query()->create(['stash_id' => $stash->id, 'user_id' => $this->user->id, 'title' => 'Scraped']);
    $stash->update(['title' => null]);

    $this
        ->withToken($this->token)
        ->getJson('/api/v1/stashes/lookup?url=https://example.com/scraped')
        ->assertJson(['saved' => true, 'title' => 'Scraped']);
    $this
        ->withToken($this->token)
        ->getJson('/api/v1/stashes/lookup?url=chrome://settings')
        ->assertOk()
        ->assertJson(['saved' => false]);
    $this->withToken($this->token)->getJson('/api/v1/stashes/lookup')->assertUnprocessable();
});

test('tags are listed for autocomplete, most used first, and a typed start narrows them', function () {
    $tags = app(TagSync::class);
    $a = Stash::factory()->for($this->user)->create();
    $b = Stash::factory()->for($this->user)->create();
    $tags->addByUser($a, 'design');
    $tags->addByUser($b, 'design');
    $tags->addByUser($a, 'dev');
    $tags->addByUser($a, 'baking');

    $names = fn (string $query = '') => array_column(
        $this
            ->withToken($this->token)
            ->getJson('/api/v1/tags'.$query)
            ->assertOk()
            ->json('data'),
        'name',
    );

    expect($names())
        ->toBe(['design', 'baking', 'dev'])
        ->and($names('?q=de'))
        ->toBe(['design', 'dev'])
        ->and($names('?q=DE'))
        ->toBe(['design', 'dev'])
        ->and($names('?q=zzz'))
        ->toBeEmpty();
});

test('a % or _ in the typed start is just a character', function () {
    $stash = Stash::factory()->for($this->user)->create();
    app(TagSync::class)->addByUser($stash, '100%');
    app(TagSync::class)->addByUser($stash, 'a_b');
    app(TagSync::class)->addByUser($stash, 'axb');

    $names = fn (string $q) => array_column(
        $this
            ->withToken($this->token)
            ->getJson('/api/v1/tags?q='.urlencode($q))
            ->json('data'),
        'name',
    );

    expect($names('%'))->toBeEmpty()->and($names('a_'))->toBe(['a_b'])->and($names('100%'))->toBe(['100%']);
});

test('collections are listed in the order of the sidebar', function () {
    Collection::factory()->for($this->user)->create(['name' => 'Second', 'position' => 2]);
    Collection::factory()->for($this->user)->create(['name' => 'First', 'position' => 1]);

    $this
        ->withToken($this->token)
        ->getJson('/api/v1/collections')
        ->assertOk()
        ->assertJsonPath('data.0.name', 'First')
        ->assertJsonPath('data.1.name', 'Second')
        ->assertJsonStructure(['data' => [['id', 'name', 'stashes_count']]]);
});

test('the read endpoints need the read ability and a token', function (string $path) {
    $this->getJson($path)->assertUnauthorized();

    $createOnly = $this->user->createToken('create', [TokenAbility::Create->value])->plainTextToken;
    $this->withToken($createOnly)->getJson($path)->assertForbidden();
})->with(['/api/v1/stashes/lookup?url=https://example.com', '/api/v1/tags', '/api/v1/collections']);

test('lookups are limited per token', function () {
    config(['stashlist.api.lookups_per_minute' => 2]);

    $this->withToken($this->token)->getJson('/api/v1/tags')->assertOk();
    $this->withToken($this->token)->getJson('/api/v1/collections')->assertOk();
    $this->withToken($this->token)->getJson('/api/v1/tags')->assertTooManyRequests();
});

test('a token of one user never reaches the data of another', function () {
    $other = User::factory()->create();
    $theirs = link_for($other, 'https://example.com/secret', 'Theirs');
    app(TagSync::class)->addByUser($theirs, 'secret-tag');
    Collection::factory()->for($other)->create(['name' => 'Their collection']);

    $this
        ->withToken($this->token)
        ->getJson('/api/v1/stashes/lookup?url=https://example.com/secret')
        ->assertExactJson(['saved' => false, 'id' => null, 'title' => null, 'tags' => []]);
    expect($this->withToken($this->token)->getJson('/api/v1/tags')->json('data'))
        ->toBeEmpty()
        ->and($this->withToken($this->token)->getJson('/api/v1/collections')->json('data'))
        ->toBeEmpty();

    // Saving the same address is a new stash of my own, not a duplicate of theirs.
    $this
        ->withToken($this->token)
        ->postJson('/api/v1/stashes', ['url' => 'https://example.com/secret'])
        ->assertCreated()
        ->assertJsonMissing(['id' => $theirs->id]);

    expect(Stash::withoutGlobalScopes()->where('url', 'https://example.com/secret')->count())
        ->toBe(2)
        ->and(Tag::withoutGlobalScopes()->count())
        ->toBe(1);
});

test('the list gives the newest stashes without a query and carries what a result needs', function () {
    $old = link_for($this->user, 'https://example.com/old', 'Old');
    $old->forceFill(['created_at' => now()->subDay()])->save();
    $new = link_for($this->user, 'https://example.com/new', 'New');
    app(TagSync::class)->addByUser($new, 'Design');
    link_for(User::factory()->create(), 'https://example.com/theirs', 'Theirs');

    $this
        ->withToken($this->token)
        ->getJson('/api/v1/stashes')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.id', $new->id)
        ->assertJsonPath('data.0.title', 'New')
        ->assertJsonPath('data.0.tags', ['Design'])
        ->assertJsonPath('data.0.web_url', route('stashes.show', $new))
        ->assertJsonPath('data.1.id', $old->id)
        ->assertJsonStructure([
            'data' => [['id', 'type', 'url', 'title', 'summary', 'tags', 'web_url', 'thumbnail_url', 'created_at']],
        ]);
});

test('a query lists the matches in the order of the engine, mine only', function () {
    $engine = Tests\Support\FakeSearchEngine::install();
    $alpha = link_for($this->user, 'https://example.com/a', 'Alpha');
    $beta = link_for($this->user, 'https://example.com/b', 'Beta');
    $theirs = link_for(User::factory()->create(), 'https://example.com/t', 'Theirs');
    $engine->hits = [$theirs->id, $beta->id, $alpha->id];

    $this
        ->withToken($this->token)
        ->getJson('/api/v1/stashes?q=bread&mode=keyword&limit=5')
        ->assertOk()
        ->assertJsonPath('data.*.title', ['Beta', 'Alpha']);
});

test('the list needs the search ability and a sane limit', function () {
    $writeOnly = $this->user->createToken('w', [TokenAbility::Create->value])->plainTextToken;

    $this->withToken($writeOnly)->getJson('/api/v1/stashes')->assertForbidden();
    // The guard remembers the user of the request before; a real second request starts fresh.
    app('auth')->forgetGuards();
    $this->withToken($this->token)->getJson('/api/v1/stashes?limit=500')->assertUnprocessable();
    $this->withToken($this->token)->getJson('/api/v1/stashes?mode=nonsense')->assertUnprocessable();
});
