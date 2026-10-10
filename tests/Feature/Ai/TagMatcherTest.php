<?php

declare(strict_types=1);

use App\Models\Tag;
use App\Tags\TagMatcher;

function tag(string $name): Tag
{
    return new Tag(['name' => $name, 'slug' => mb_strtolower($name)]);
}

/**
 * @param  list<string>  $existing
 */
function matched(string $proposal, array $existing): ?string
{
    return new TagMatcher()->match($proposal, array_map(tag(...), $existing))?->name;
}

test('the same name matches, whatever its case', function () {
    expect(matched('Sourdough Baking', ['Cooking', 'sourdough baking']))->toBe('sourdough baking');
});

test('a plural matches its singular and the other way round', function (string $proposal, string $existing) {
    expect(matched($proposal, ['Cooking', $existing]))->toBe($existing);
})->with([
    ['sourdough starters', 'sourdough starter'],
    ['sourdough starter',  'sourdough starters'],
    ['libraries',          'library'],
    ['Recipes',            'recipe'],
    ['buses',              'bus'],
]);

test('a spelling one letter off matches in a longer word', function () {
    expect(matched('colour', ['color']))->toBe('color');
});

test('short names must match exactly: one letter is a different word', function () {
    expect(matched('cat', ['car']))
        ->toBeNull()
        ->and(matched('car', ['car']))
        ->toBe('car');
});

test('different words do not match, even when they look alike', function () {
    expect(matched('react', ['reach']))
        ->toBeNull()
        ->and(matched('design', ['designer']))
        ->toBeNull()
        ->and(matched('baking', ['biking']))
        ->toBeNull();
});

test('nothing matches an empty vocabulary', function () {
    expect(matched('anything', []))->toBeNull();
});
