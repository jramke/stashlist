<?php

declare(strict_types=1);

use App\Data\FeedFiltersData;
use App\Enums\StashType;
use App\Models\Collection;
use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Models\User;
use App\Search\StashSearch;
use App\Tags\TagSync;
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
 * @param  array<string, mixed>  $attributes
 */
function indexed_stash(User $user, array $attributes = []): Stash
{
    return Stash::factory()->for($user)->create($attributes);
}

/**
 * Ids of the stashes that match, best match first.
 *
 * @return list<int>
 */
function found(User $user, string $text, ?FeedFiltersData $filters = null): array
{
    test()->meili->settle();

    // The page loads through the model, whose scope needs the signed-in user.
    test()->actingAs($user);

    return array_map(
        intval(...),
        resolve(StashSearch::class)
            ->search($user, $text, $filters ?? new FeedFiltersData, perPage: 60)
            ->pluck('id')
            ->all(),
    );
}

test('a user finds their own stashes by title, tag, domain and the text of the page', function () {
    $byTitle = indexed_stash($this->user, ['title' => 'Sourdough starter guide', 'url' => null, 'domain' => null]);
    $byTag = indexed_stash($this->user, ['title' => 'Unrelated', 'url' => null, 'domain' => null]);
    app(TagSync::class)->addByUser($byTag, 'Fermentation');
    $byDomain = indexed_stash($this->user, [
        'title' => 'Other',
        'url' => 'https://bakeclub.example/a',
        'domain' => 'bakeclub.example',
    ]);
    $byText = indexed_stash($this->user, ['title' => 'Plain', 'url' => null, 'domain' => null]);
    StashEnrichment::query()->create([
        'stash_id' => $byText->id,
        'user_id' => $this->user->id,
        'extracted_text' => 'A living culture of wild yeast and bacteria.',
    ]);
    new App\Jobs\IndexStash($byText->id, $this->user->id)->handle();

    expect(found($this->user, text: 'sourdough'))
        ->toBe([$byTitle->id])
        ->and(found($this->user, text: 'fermentation'))
        ->toBe([$byTag->id])
        ->and(found($this->user, text: 'bakeclub'))
        ->toBe([$byDomain->id])
        ->and(found($this->user, text: 'wild yeast'))
        ->toBe([$byText->id]);
});

test('what a user highlighted on a page makes the stash easier to find', function () {
    $stash = indexed_stash($this->user, ['title' => 'Plain title', 'url' => null, 'domain' => null]);
    App\Models\StashHighlight::factory()->onStash($stash)->create(['text' => 'the fermentation lasts a full week']);

    expect(found($this->user, text: 'fermentation'))->toBe([$stash->id]);
});

test('typing finds a stash before the word is complete, and a typo still finds it', function () {
    $stash = indexed_stash($this->user, ['title' => 'Sourdough starter guide']);

    expect(found($this->user, text: 'sourd'))
        ->toBe([$stash->id])
        ->and(found($this->user, text: 'sourdogh'))
        ->toBe([$stash->id])
        ->and(found($this->user, text: 'nothing like it'))
        ->toBeEmpty();
});

test('the same text owned by two users is found by its owner only', function () {
    $other = User::factory()->create();
    $mine = indexed_stash($this->user, ['title' => 'Quarterly plan', 'body' => 'budget review']);
    $theirs = indexed_stash($other, ['title' => 'Quarterly plan', 'body' => 'budget review']);

    expect(found($this->user, text: 'quarterly plan'))
        ->toBe([$mine->id])
        ->and(found($other, text: 'quarterly plan'))
        ->toBe([$theirs->id])
        ->and(found($this->user, text: 'budget'))
        ->toBe([$mine->id]);
});

test('every filter narrows the result, with tags all required', function () {
    $collection = Collection::factory()->for($this->user)->create();
    $tags = app(TagSync::class);

    $both = indexed_stash($this->user, ['title' => 'Bread both', 'type' => StashType::Link]);
    $one = indexed_stash($this->user, ['title' => 'Bread one', 'type' => StashType::Link]);
    $note = indexed_stash($this->user, [
        'title' => 'Bread note',
        'type' => StashType::Note,
        'url' => null,
        'domain' => null,
    ]);
    $tagA = $tags->addByUser($both, 'a-tag');
    $tagB = $tags->addByUser($both, 'b-tag');
    $tags->addByUser($one, 'a-tag');
    $tags->addByUser($note, 'a-tag');
    app(App\Collections\CollectionSync::class)->syncCollections($both, [$collection->id]);

    expect(found($this->user, text: 'bread'))
        ->toHaveCount(3)
        ->and(found($this->user, text: 'bread', filters: new FeedFiltersData(tags: [$tagA->id])))
        ->toEqualCanonicalizing([$both->id, $one->id, $note->id])
        ->and(found($this->user, text: 'bread', filters: new FeedFiltersData(tags: [$tagA->id, $tagB->id])))
        ->toBe([$both->id])
        ->and(found($this->user, text: 'bread', filters: new FeedFiltersData(type: StashType::Note)))
        ->toBe([$note->id])
        ->and(found($this->user, text: 'bread', filters: new FeedFiltersData(collection: (string)$collection->id)))
        ->toBe([$both->id])
        ->and(found($this->user, text: 'bread', filters: new FeedFiltersData(collection: 'none')))
        ->toEqualCanonicalizing([$one->id, $note->id]);
});

test('renaming a tag, removing a stash and editing a title show up in the next search', function () {
    $stash = indexed_stash($this->user, ['title' => 'Plain title']);
    $tag = app(TagSync::class)->addByUser($stash, 'Baking');

    expect(found($this->user, text: 'baking'))->toBe([$stash->id]);

    app(TagSync::class)->rename($tag, 'Pastry');

    expect(found($this->user, text: 'baking'))
        ->toBeEmpty()
        ->and(found($this->user, text: 'pastry'))
        ->toBe([$stash->id]);

    $stash->update(['title' => 'Croissant lamination']);

    expect(found($this->user, text: 'croissant'))->toBe([$stash->id]);

    $stash->delete();

    expect(found($this->user, text: 'croissant'))->toBeEmpty();
});

test('pages are exact and a later page continues where the earlier one stopped', function () {
    foreach (range(start: 1, end: 5) as $number) {
        indexed_stash($this->user, ['title' => "Bread number {$number}"]);
    }
    $this->meili->settle();
    $this->actingAs($this->user);

    $search = resolve(StashSearch::class);
    $first = $search->search($this->user, 'bread', new FeedFiltersData, perPage: 2);
    Illuminate\Pagination\Paginator::currentPageResolver(static fn (): int => 3);
    $last = $search->search($this->user, 'bread', new FeedFiltersData, perPage: 2);

    expect($first->total())->toBe(5)->and($first->count())->toBe(2)->and($last->count())->toBe(1);
});

test('the feed route answers a search with the matches of its user', function () {
    $other = User::factory()->create();
    indexed_stash($other, ['title' => 'Bread of someone else']);
    $mine = indexed_stash($this->user, ['title' => 'Bread of mine']);
    $this->meili->settle();

    $response = $this->actingAs($this->user)->get('/stashes?q=bread&mode=keyword');

    expect(array_column($response->viewData('page')['props']['stashes']['data'], 'id'))->toBe([$mine->id]);
});

test('pictures are narrowed by the color they were filed under', function () {
    $red = indexed_stash($this->user, ['title' => 'Sneakers red', 'url' => null, 'domain' => null]);
    $blue = indexed_stash($this->user, ['title' => 'Sneakers blue', 'url' => null, 'domain' => null]);

    foreach ([[$red, ['red', 'white']], [$blue, ['blue']]] as [$stash, $names]) {
        StashEnrichment::query()->create([
            'stash_id' => $stash->id,
            'user_id' => $this->user->id,
            'color_names' => $names,
        ]);
        new App\Jobs\IndexStash($stash->id, $this->user->id)->handle();
    }

    expect(found($this->user, text: 'sneakers', filters: new FeedFiltersData(color: App\Enums\ColorName::Red)))
        ->toBe([$red->id])
        ->and(found($this->user, text: 'sneakers', filters: new FeedFiltersData(color: App\Enums\ColorName::White)))
        ->toBe([$red->id])
        ->and(found($this->user, text: 'sneakers', filters: new FeedFiltersData(color: App\Enums\ColorName::Green)))
        ->toBeEmpty()
        ->and(found($this->user, text: 'sneakers'))
        ->toEqualCanonicalizing([$red->id, $blue->id]);
});

test('links are narrowed by their kind', function () {
    $article = indexed_stash($this->user, ['title' => 'Bread notes', 'subtype' => 'article']);
    $recipe = indexed_stash($this->user, ['title' => 'Bread loaf', 'subtype' => 'recipe']);
    $this->meili->settle();

    expect(found($this->user, text: 'bread', filters: new FeedFiltersData(subtype: App\Enums\Subtype::Recipe)))
        ->toBe([$recipe->id])
        ->and(found($this->user, text: 'bread', filters: new FeedFiltersData(subtype: App\Enums\Subtype::Video)))
        ->toBeEmpty()
        ->and(found($this->user, text: 'bread'))
        ->toEqualCanonicalizing([$article->id, $recipe->id]);
});
