<?php

declare(strict_types=1);

use App\Enums\StashType;
use App\Support\InputClassifier;

test('input is classified', function (string $input, StashType $type, string $value) {
    $classified = new InputClassifier()->classify($input);

    expect($classified->type)->toBe($type)->and($classified->value)->toBe($value);
})->with([
    'link' => ['https://example.com/post', StashType::Link, 'https://example.com/post'],
    'link with spaces around it' => ["  https://example.com/post\n", StashType::Link, 'https://example.com/post'],
    'http link' => ['http://example.com', StashType::Link, 'http://example.com'],
    'protocol-relative link' => ['//example.com/a', StashType::Link, 'https://example.com/a'],
    'link keeps tracking parameters and fragment' => [
        'https://example.com/a?utm_source=x#top',
        StashType::Link,
        'https://example.com/a?utm_source=x#top',
    ],
    'image link' => ['https://example.com/cat.JPG', StashType::Image, 'https://example.com/cat.JPG'],
    'image link with a query' => [
        'https://example.com/cat.png?w=200',
        StashType::Image,
        'https://example.com/cat.png?w=200',
    ],
    'svg is a plain link' => ['https://example.com/logo.svg', StashType::Link, 'https://example.com/logo.svg'],
    'hex color' => ['#E63946', StashType::Color, '#e63946'],
    'short hex color' => ['#fff', StashType::Color, '#fff'],
    'rgb color' => ['rgb(230, 57, 70)', StashType::Color, 'rgb(230, 57, 70)'],
    'rgba color' => ['rgba(230, 57, 70, 0.5)', StashType::Color, 'rgba(230, 57, 70, 0.5)'],
    'hsl color' => ['hsl(355, 78%, 56%)', StashType::Color, 'hsl(355, 78%, 56%)'],
    'oklch color' => ['oklch(0.7, 50%, 120)', StashType::Color, 'oklch(0.7, 50%, 120)'],
    'a color name is a word' => ['Rebeccapurple', StashType::Note, 'Rebeccapurple'],
    'plain text' => ['remember to call mum', StashType::Note, 'remember to call mum'],
    'text containing a url' => [
        'read https://example.com/post later',
        StashType::Note,
        'read https://example.com/post later',
    ],
    'multi-line text' => ["first line\nsecond line", StashType::Note, "first line\nsecond line"],
    'not a hex color' => ['#12345', StashType::Note, '#12345'],
    'ftp url' => ['ftp://example.com/file', StashType::Note, 'ftp://example.com/file'],
    'javascript url' => ['javascript:alert(1)', StashType::Note, 'javascript:alert(1)'],
    'url with credentials' => ['https://user:pw@example.com/', StashType::Note, 'https://user:pw@example.com/'],
    'word that is not a color' => ['sourdough', StashType::Note, 'sourdough'],
]);

test('a url longer than the column is kept as text', function () {
    $url = 'https://example.com/'.str_repeat('a', times: 2100);

    expect(new InputClassifier()->classify($url)->type)->toBe(StashType::Note);
});

test('empty input is an empty note', function () {
    $classified = new InputClassifier()->classify("  \n ");

    expect($classified->type)->toBe(StashType::Note)->and($classified->value)->toBeEmpty();
});

test('what counts as a color is the same here and in the box', function () {
    /** @var array{colors: list<string>, text: list<string>} $samples */
    $samples = json_decode(
        (string)file_get_contents(dirname(__DIR__).'/fixtures/input-colors.json'),
        associative: true,
    );
    $classifier = new InputClassifier;

    foreach ($samples['colors'] as $color) {
        expect($classifier->classify($color)->type)->toBe(StashType::Color, $color);
    }

    foreach ($samples['text'] as $text) {
        expect($classifier->classify($text)->type)->toBe(StashType::Note, $text);
    }
});

test('a color field takes a color name, which the box does not', function () {
    $classifier = new InputClassifier;

    expect($classifier->isColorValue('Rebeccapurple'))
        ->toBeTrue()
        ->and($classifier->isColorValue(' #FFF '))
        ->toBeTrue()
        ->and($classifier->isColorValue('oklch(0.7 0.1 200)'))
        ->toBeTrue()
        ->and($classifier->isColorValue('sourdough'))
        ->toBeFalse()
        ->and($classifier->classify('Rebeccapurple')->type)
        ->toBe(StashType::Note);
});
