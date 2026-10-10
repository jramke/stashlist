<?php

declare(strict_types=1);

use App\Models\Stash;
use App\Models\User;
use App\Search\Reconciler;
use Meilisearch\Client;
use Tests\Support\RealMeilisearch;

uses()->group('meilisearch');

beforeEach(function () {
    $this->meili = RealMeilisearch::start();
    $this->user = User::factory()->create();
});

afterEach(function () {
    $this->meili?->drop();
});

/**
 * @return list<int>
 */
function indexed_ids(): array
{
    test()->meili->settle();

    $documents = resolve(Client::class)->index(new Stash()->searchableAs())->getDocuments()->getResults();

    return array_values(array_map(static fn (array $document): int => (int)$document['id'], $documents));
}

test('a document without a stash is removed and a stash without a document is indexed again', function () {
    $kept = Stash::factory()->for($this->user)->create();
    $lost = Stash::factory()->for($this->user)->create();
    $this->meili->settle();
    $index = resolve(Client::class)->index(new Stash()->searchableAs());
    // A delete that never reached the index, and an index write that never happened.
    $index->addDocuments([[
        'id' => 999_999,
        'user_id' => $this->user->id,
        'title' => 'ghost',
        '_vectors' => ['text_v1' => null],
    ]], 'id');
    $index->deleteDocument($lost->id);
    $this->meili->settle();

    expect(indexed_ids())->toEqualCanonicalizing([$kept->id, 999_999]);

    $dryRun = resolve(Reconciler::class)->inspect();
    expect($dryRun->ghosts)->toBe([999_999])->and($dryRun->missing)->toBe([$lost->id]);
    expect(indexed_ids())->toEqualCanonicalizing([$kept->id, 999_999]);

    resolve(Reconciler::class)->repair();

    expect(indexed_ids())->toEqualCanonicalizing([$kept->id, $lost->id]);
    expect(resolve(Reconciler::class)->inspect()->isClean())->toBeTrue();
});

test('the command reports and repairs, and a dry run only reports', function () {
    $lost = Stash::factory()->for($this->user)->create();
    $this->meili->settle();
    resolve(Client::class)->index(new Stash()->searchableAs())->deleteDocument($lost->id);
    $this->meili->settle();

    $this
        ->artisan('stashlist:reconcile-index', ['--dry-run' => true])
        ->expectsOutputToContain('1 stashes without a document would be queued')
        ->assertFailed();
    expect(indexed_ids())->toBeEmpty();

    $this
        ->artisan('stashlist:reconcile-index')
        ->expectsOutputToContain('1 stashes without a document were queued')
        ->assertFailed();
    expect(indexed_ids())->toBe([$lost->id]);

    $this->artisan('stashlist:reconcile-index')->assertSuccessful();
});

test('one user\'s part of the index can be removed as a whole, and counted to prove it', function () {
    $mine = [Stash::factory()->for($this->user)->create(), Stash::factory()->for($this->user)->create()];
    $other = User::factory()->create();
    Stash::factory()->for($other)->create();
    $this->meili->settle();
    $index = resolve(App\Search\MeilisearchUserIndex::class);

    expect($index->count($this->user->id))->toBe(2)->and($index->count($other->id))->toBe(1);

    $index->purge($this->user->id);

    expect($index->count($this->user->id))->toBe(0)->and($index->count($other->id))->toBe(1);
    expect(array_map(static fn (Stash $stash): int => $stash->id, $mine))->each->not->toBeIn(indexed_ids());
});
