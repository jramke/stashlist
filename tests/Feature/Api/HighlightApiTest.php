<?php

declare(strict_types=1);

use App\Enums\TokenAbility;
use App\Jobs\ExtractContent;
use App\Jobs\IndexStash;
use App\Models\Stash;
use App\Models\StashHighlight;
use App\Models\User;
use App\Support\UrlNormalizer;
use Illuminate\Support\Facades\Queue;
use Tests\Support\FakeSearchEngine;

beforeEach(function () {
    Queue::fake();

    $this->user = User::factory()->create();
    $this->token = $this->user->createToken('test', TokenAbility::values())->plainTextToken;
    $this->stash = link_stash_of($this->user, 'https://bakeclub.example/starter');
});

function link_stash_of(User $user, string $url): Stash
{
    return Stash::factory()
        ->for($user)
        ->create([
            'url' => $url,
            'url_hash' => UrlNormalizer::hash((string)UrlNormalizer::normalize($url)),
            'domain' => parse_url($url, PHP_URL_HOST),
        ]);
}

function mark(
    Stash $stash,
    array $data = [],
    #[SensitiveParameter]
    ?string $token = null,
): Illuminate\Testing\TestResponse {
    return test()
        ->withToken($token ?? test()->token)
        ->postJson("/api/v1/stashes/{$stash->id}/highlights", [
            'text' => 'a living culture of wild yeast',
            'prefix' => 'A sourdough starter is ',
            'suffix' => ' that you keep alive',
            'start_offset' => 120,
            ...$data,
        ]);
}

test('a highlight is made on a stash, and the answer says what was made', function () {
    $response = mark($this->stash, [
        'range_hint' => ['start' => 'p:2', 'end' => 'p:2'],
        'color' => 'yellow',
        'note' => 'remember',
    ]);

    $highlight = StashHighlight::query()->sole();

    $response
        ->assertCreated()
        ->assertExactJson([
            'id' => $highlight->id,
            'stash_id' => $this->stash->id,
            'url_hash' => bin2hex($this->stash->url_hash),
            'text' => 'a living culture of wild yeast',
            'prefix' => 'A sourdough starter is',
            'suffix' => 'that you keep alive',
            'start_offset' => 120,
            'range_hint' => ['start' => 'p:2', 'end' => 'p:2'],
            'color' => 'yellow',
            'note' => 'remember',
            'revision' => 1,
            'created_at' => $highlight->created_at->toIso8601String(),
            'updated_at' => $highlight->updated_at->toIso8601String(),
        ]);
    expect($highlight->user_id)->toBe($this->user->id);
});

test('marking the same passage again returns the highlight that exists', function () {
    $first = mark($this->stash)->assertCreated()->json('id');
    $second = mark($this->stash)->assertOk()->json('id');
    $other = mark($this->stash, ['prefix' => 'somewhere else '])->assertCreated()->json('id');

    expect($second)->toBe($first)->and($other)->not->toBe($first)->and(StashHighlight::count())->toBe(2);
});

test('highlights need a token that may manage them', function () {
    $this->postJson("/api/v1/stashes/{$this->stash->id}/highlights", ['text' => 'x'])->assertUnauthorized();

    $without = $this->user->createToken('no highlights', [
        TokenAbility::Create->value,
        TokenAbility::Read->value,
    ])->plainTextToken;
    mark($this->stash, token: $without)->assertForbidden();
    $this->withToken($without)->patchJson('/api/v1/highlights/1', ['note' => 'x'])->assertForbidden();
    $this->withToken($without)->deleteJson('/api/v1/highlights/1')->assertForbidden();

    expect(StashHighlight::count())->toBe(0);
});

test('what a client sends is checked and cleaned', function (array $data, string $field) {
    mark($this->stash, $data)->assertUnprocessable()->assertJsonValidationErrors($field);

    expect(StashHighlight::count())->toBe(0);
})->with([
    'no passage' => [['text' => ''], 'text'],
    'a passage that is too long' => [['text' => str_repeat('a', 2001)], 'text'],
    'context that is too long' => [['prefix' => str_repeat('a', 201)], 'prefix'],
    'a note that is too long' => [['note' => str_repeat('a', 1001)], 'note'],
    'a color that is no color' => [['color' => 'javascript:alert(1)'], 'color'],
    'a negative offset' => [['start_offset' => -1], 'start_offset'],
    'a range hint that is too big' => [['range_hint' => ['x' => str_repeat('a', 2100)]], 'range_hint'],
]);

test('control characters do not reach the database', function () {
    mark($this->stash, ['text' => "a pass\x00age", 'note' => "no\x07te"])->assertCreated();

    expect(StashHighlight::query()->sole())->text->toBe('a passage')->note->toBe('note');
});

test('a stash holds a limited number of highlights, and so does an account', function () {
    config(['stashlist.highlights.per_stash' => 2, 'stashlist.highlights.per_user' => 3]);

    mark($this->stash, ['text' => 'one'])->assertCreated();
    mark($this->stash, ['text' => 'two'])->assertCreated();
    mark($this->stash, ['text' => 'three'])->assertUnprocessable()->assertJsonValidationErrors('text');
    mark($this->stash, ['text' => 'two'])->assertOk();

    $other = link_stash_of($this->user, 'https://example.com/other');
    mark($other, ['text' => 'four'])->assertCreated();
    mark($other, ['text' => 'five'])->assertUnprocessable();

    expect(StashHighlight::count())->toBe(3);
});

test('a highlight can be made on a page by its address, without saving the page first', function () {
    $this
        ->withToken($this->token)
        ->postJson('/api/v1/highlights', [
            'url' => 'https://www.example.com/post?utm_source=x',
            'title' => 'A post',
            'text' => 'the passage',
        ])
        ->assertCreated()
        ->assertJsonPath('text', 'the passage');

    $stash = Stash::query()->where('url', 'like', '%example.com/post%')->sole();

    expect($stash->title)->toBe('A post')->and(StashHighlight::query()->sole()->stash_id)->toBe($stash->id);
    Queue::assertPushed(ExtractContent::class, 1);
});

test('a highlight on an address the user has saved uses that stash', function () {
    $this
        ->withToken($this->token)
        ->postJson('/api/v1/highlights', [
            'url' => 'https://BAKECLUB.example/starter?utm_campaign=y',
            'text' => 'passage',
        ])
        ->assertCreated();

    expect(Stash::count())->toBe(1)->and(StashHighlight::query()->sole()->stash_id)->toBe($this->stash->id);
    Queue::assertNotPushed(ExtractContent::class);
});

test('a highlight on an address needs a web address and the right to save', function () {
    $this
        ->withToken($this->token)
        ->postJson('/api/v1/highlights', ['url' => 'file:///etc/passwd', 'text' => 'x'])
        ->assertUnprocessable();
    $this->withToken($this->token)->postJson('/api/v1/highlights', ['text' => 'x'])->assertUnprocessable();

    $noSaving = $this->user->createToken('no saving', [TokenAbility::Highlight->value])->plainTextToken;
    app('auth')->forgetGuards();
    $this
        ->withToken($noSaving)
        ->postJson('/api/v1/highlights', ['url' => 'https://example.com/new', 'text' => 'x'])
        ->assertForbidden();

    expect(Stash::count())->toBe(1);
});

test('the list gives the id and revision of every highlight, with an ETag', function () {
    $a = StashHighlight::factory()->onStash($this->stash)->create();
    $b = StashHighlight::factory()->onStash($this->stash)->create();

    $first = $this->withToken($this->token)->getJson('/api/v1/highlights/index')->assertOk();

    expect($first->json())
        ->toBe([['id' => $a->id, 'v' => 1], ['id' => $b->id, 'v' => 1]])
        ->and($first->headers->get('ETag'))
        ->not->toBeNull();

    $etag = $first->headers->get('ETag');
    $this
        ->withToken($this->token)
        ->getJson('/api/v1/highlights/index', ['If-None-Match' => $etag])
        ->assertNotModified();

    $this->withToken($this->token)->patchJson("/api/v1/highlights/{$a->id}", ['note' => 'changed'])->assertOk();

    $changed = $this
        ->withToken($this->token)
        ->getJson('/api/v1/highlights/index', ['If-None-Match' => $etag])
        ->assertOk();
    expect($changed->json())->toBe([['id' => $a->id, 'v' => 2], ['id' => $b->id, 'v' => 1]]);

    $this->withToken($this->token)->deleteJson("/api/v1/highlights/{$b->id}")->assertNoContent();

    expect($this->withToken($this->token)->getJson('/api/v1/highlights/index')->json())->toBe([[
        'id' => $a->id,
        'v' => 2,
    ]]);
});

test('highlights come by id, each with the hash of its page', function () {
    $a = StashHighlight::factory()->onStash($this->stash)->create(['text' => 'first']);
    $b = StashHighlight::factory()->onStash($this->stash)->create(['text' => 'second']);

    $response = $this->withToken($this->token)->getJson("/api/v1/highlights?ids={$b->id},{$a->id},999999")->assertOk();

    expect(array_column($response->json('data'), 'text'))
        ->toBe(['first', 'second'])
        ->and($response->json('data.0.url_hash'))
        ->toBe(bin2hex($this->stash->url_hash));
});

test('asking for highlights needs ids and not too many', function () {
    $this->withToken($this->token)->getJson('/api/v1/highlights')->assertUnprocessable();

    $ids = implode(',', range(1, 201));
    $this
        ->withToken($this->token)
        ->getJson("/api/v1/highlights?ids={$ids}")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('ids');
});

test('the note and the color can change, the passage cannot', function () {
    $highlight = StashHighlight::factory()
        ->onStash($this->stash)
        ->create(['text' => 'fixed', 'note' => 'old', 'color' => 'yellow']);

    $this
        ->withToken($this->token)
        ->patchJson("/api/v1/highlights/{$highlight->id}", ['note' => 'new', 'color' => null, 'text' => 'ignored'])
        ->assertOk()
        ->assertJson(['note' => 'new', 'color' => null, 'text' => 'fixed', 'revision' => 2]);

    $this->withToken($this->token)->patchJson("/api/v1/highlights/{$highlight->id}", [
        'note' => '',
    ])->assertOk()->assertJson(['note' => null]);
    $this->withToken($this->token)->patchJson("/api/v1/highlights/{$highlight->id}", [
        'color' => 'red tape',
    ])->assertUnprocessable();
});

test('deleting a highlight, or its stash, removes it', function () {
    $highlight = StashHighlight::factory()->onStash($this->stash)->create();
    $kept = StashHighlight::factory()->onStash(link_stash_of($this->user, 'https://example.com/b'))->create();

    $this->withToken($this->token)->deleteJson("/api/v1/highlights/{$highlight->id}")->assertNoContent();
    expect(StashHighlight::count())->toBe(1);

    $kept->stash->delete();
    expect(StashHighlight::count())->toBe(0);
});

test('one user cannot reach the highlights of another', function () {
    $other = User::factory()->create();
    $theirs = link_stash_of($other, 'https://example.com/theirs');
    $theirHighlight = StashHighlight::factory()->onStash($theirs)->create();
    $mine = StashHighlight::factory()->onStash($this->stash)->create();

    mark($theirs)->assertNotFound();
    $this->withToken($this->token)->patchJson("/api/v1/highlights/{$theirHighlight->id}", [
        'note' => 'mine now',
    ])->assertNotFound();
    $this->withToken($this->token)->deleteJson("/api/v1/highlights/{$theirHighlight->id}")->assertNotFound();

    expect($this->withToken($this->token)->getJson('/api/v1/highlights/index')->json())
        ->toBe([['id' => $mine->id, 'v' => 1]])
        ->and(
            $this
                ->withToken($this->token)
                ->getJson("/api/v1/highlights?ids={$theirHighlight->id},{$mine->id}")
                ->json('data.*.id'),
        )
        ->toBe([$mine->id])
        ->and($theirHighlight->fresh()->note)
        ->toBeNull()
        ->and(StashHighlight::withoutGlobalScopes()->count())
        ->toBe(2);
});

test('highlights are part of the search document and reindex the stash', function () {
    // Only what the pipeline starts is held back; the indexing jobs run.
    Queue::fake([ExtractContent::class, IndexStash::class]);
    $engine = FakeSearchEngine::install();
    $stash = link_stash_of($this->user, 'https://example.com/indexed');

    $highlight = StashHighlight::factory()->onStash($stash)->create(['text' => 'worth remembering']);

    expect($engine->documents[$stash->id]['highlights'])->toBe(['worth remembering']);

    $highlight->delete();

    expect($engine->documents[$stash->id]['highlights'])->toBeEmpty();
});
