<?php

declare(strict_types=1);

use App\Support\UrlNormalizer;

dataset('url normalization cases', function () {
    $fixture = json_decode(
        (string)file_get_contents(dirname(__DIR__).'/fixtures/url-normalization.json'),
        associative: true,
        flags: JSON_THROW_ON_ERROR,
    );

    foreach ($fixture['cases'] as $case) {
        yield $case['input'] => [$case['input'], $case['expected']];
    }
});

test('urls normalize as written in the shared fixture', function (string $input, ?string $expected) {
    expect(UrlNormalizer::normalize($input))->toBe($expected);
})->with('url normalization cases');

test('normalizing twice changes nothing', function (string $input, ?string $expected) {
    if ($expected === null) {
        expect(UrlNormalizer::normalize($input))->toBeNull();

        return;
    }

    expect(UrlNormalizer::normalize($expected))->toBe($expected);
})->with('url normalization cases');

test('equivalent urls share a hash and different urls do not', function () {
    $a = UrlNormalizer::normalize('https://Example.com/post?utm_source=x#top');
    $b = UrlNormalizer::normalize('https://example.com/post');
    $c = UrlNormalizer::normalize('https://example.com/other');

    expect(UrlNormalizer::hash((string)$a))
        ->toBe(UrlNormalizer::hash((string)$b))
        ->not
        ->toBe(UrlNormalizer::hash((string)$c))
        ->and(strlen(UrlNormalizer::hash((string)$a)))
        ->toBe(32);
});
