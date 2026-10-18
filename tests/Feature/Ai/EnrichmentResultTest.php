<?php

declare(strict_types=1);

use App\Ai\EnrichmentInvalid;
use App\Ai\EnrichmentResult;
use App\Enums\Subtype;
use Tests\Support\FakeAi;

test('a good answer is accepted as it is', function () {
    $result = EnrichmentResult::from(FakeAi::answer());

    expect($result->tags)
        ->toBe(['sourdough', 'baking', 'bread', 'fermentation', 'recipes'])
        ->and($result->subtype)
        ->toBe(Subtype::Article)
        ->and($result->language)
        ->toBe('en')
        ->and($result->summary)
        ->toStartWith('A week-long guide');
});

test('tags are cleaned: no hash, no duplicates, no generic words, nothing too long', function () {
    $result = EnrichmentResult::from(FakeAi::answer(['tags' => [
        '#Sourdough',
        'sourdough',
        'Website',
        'link',
        str_repeat('x', 41),
        'Bread  baking',
        '',
        42,
        'fermentation',
    ]]));

    expect($result->tags)->toBe(['Sourdough', 'Bread baking', 'fermentation']);
});

test('no more than ten tags are kept', function () {
    $result = EnrichmentResult::from(FakeAi::answer(['tags' => array_map(
        static fn (int $n): string => "tag {$n}",
        range(1, 14),
    )]));

    expect($result->tags)->toHaveCount(10)->and($result->tags[0])->toBe('tag 1');
});

test('two tags are needed, or one for a very short item', function () {
    expect(fn () => EnrichmentResult::from(FakeAi::answer(['tags' => ['one']])))
        ->toThrow(
            EnrichmentInvalid::class,
            'at least 2 tags',
        );

    expect(EnrichmentResult::from(FakeAi::answer(['tags' => ['one', 'two']]))->tags)
        ->toBe(['one', 'two'])
        ->and(EnrichmentResult::from(FakeAi::answer(['tags' => ['one']]), minTags: 1)->tags)
        ->toBe(['one']);
});

test('a tag that only names the language of the item is dropped, in English or in that language', function () {
    $result = EnrichmentResult::from(FakeAi::answer([
        'language' => 'de',
        'tags' => ['sofa', 'German', 'Deutsch', 'möbel'],
    ]));

    expect($result->tags)->toBe(['sofa', 'möbel']);
});

test('every language goes by its English name and by its own', function (string $code, string $english, string $own) {
    $result = EnrichmentResult::from(FakeAi::answer(['language' => $code, 'tags' => [$english, $own, 'cooking']]));

    expect($result->tags)->toBe(['cooking']);
})->with([
    'German' => ['de', 'german', 'Deutsch'],
    'French' => ['fr', 'French', 'français'],
    'Spanish' => ['es', 'Spanish', 'Español'],
    'Dutch' => ['nl', 'dutch', 'Nederlands'],
    'Japanese' => ['ja', 'Japanese', '日本語'],
]);

test('the language of another item stays a tag: it can be what the page is about', function () {
    $result = EnrichmentResult::from(FakeAi::answer([
        'language' => 'de',
        'tags' => ['english', 'german grammar', 'sprachen lernen'],
    ]));

    expect($result->tags)->toBe(['english', 'german grammar', 'sprachen lernen']);
});

test('a model is not sent back because the language tag was taken out of its answer', function () {
    $result = EnrichmentResult::from(FakeAi::answer(['language' => 'en', 'tags' => ['English', 'sourdough', 'bread']]));

    expect($result->tags)->toBe(['sourdough', 'bread']);
});

test('the summary must be there and at most 400 characters', function (string $summary, string $problem) {
    try {
        EnrichmentResult::from(FakeAi::answer(['summary' => $summary]));
    } catch (EnrichmentInvalid $invalid) {
        expect($invalid->errors)->toContain($problem);

        return;
    }

    throw new RuntimeException('The answer should have been refused.');
})->with([
    'empty' => ['', 'The summary is empty.'],
    'too long' => [str_repeat('a', 401), 'The summary must be at most 400 characters.'],
]);

test('the language is a two-letter code, lowercased', function () {
    expect(EnrichmentResult::from(FakeAi::answer(['language' => ' DE ']))->language)->toBe('de');

    expect(fn () => EnrichmentResult::from(FakeAi::answer(['language' => 'english'])))
        ->toThrow(
            EnrichmentInvalid::class,
            'two-letter',
        );
});

test('the subtype must be one the model was offered', function () {
    expect(fn () => EnrichmentResult::from(FakeAi::answer(['subtype' => 'blog'])))
        ->toThrow(
            EnrichmentInvalid::class,
            'The subtype must be one of',
        );
});

test('every problem is reported at once, so one repair can fix them all', function () {
    try {
        EnrichmentResult::from([
            'title' => 'x',
            'summary' => '',
            'tags' => [],
            'subtype' => 'blog',
            'language' => '??',
        ]);
    } catch (EnrichmentInvalid $invalid) {
        expect($invalid->errors)->toHaveCount(4);

        return;
    }

    throw new RuntimeException('The answer should have been refused.');
});
