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

test('three tags are needed, or one for a very short item', function () {
    expect(fn () => EnrichmentResult::from(FakeAi::answer(['tags' => ['one', 'two']])))
        ->toThrow(
            EnrichmentInvalid::class,
            'at least 3 tags',
        );

    expect(EnrichmentResult::from(FakeAi::answer(['tags' => ['one']]), minTags: 1)->tags)->toBe(['one']);
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
