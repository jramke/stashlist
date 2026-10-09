<?php

declare(strict_types=1);

use App\Tags\TagNormalizer;

test('names are normalized for display', function (string $input, ?string $name) {
    expect(TagNormalizer::name($input))->toBe($name);
})->with([
    'plain' => ['Web Design', 'Web Design'],
    'hash and spaces' => ["  #Web   Design \n", 'Web Design'],
    'several hashes' => ['###design', 'design'],
    'hash inside is kept' => ['c#', 'c#'],
    'fullwidth letters' => ['Ｗｅｂ', 'Web'],
    'ligature' => ['ﬁnance', 'finance'],
    'control characters' => ["de\x00sign\u{200B}", 'de sign'],
    'emoji' => ['🍞 bread', '🍞 bread'],
    'only a hash' => ['#', null],
    'only spaces' => ["   \t", null],
    'empty' => ['', null],
]);

test('names are capped at 64 characters', function () {
    $name = TagNormalizer::name(str_repeat('é', times: 100));

    expect(mb_strlen((string)$name))->toBe(64);
});

test('the slug is the lowercase display name', function () {
    expect(TagNormalizer::slug('Web Design'))->toBe('web design')->and(TagNormalizer::slug('ÄÖÜ'))->toBe('äöü');
});
