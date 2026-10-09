<?php

declare(strict_types=1);

use App\Extraction\FetchedResponse;
use App\Extraction\PageParser;

function page(
    string $fixture,
    string $url = 'https://bakeclub.example/posts/starter',
    ?string $charset = null,
): FetchedResponse {
    return new FetchedResponse(
        url: $url,
        status: 200,
        contentType: 'text/html',
        charset: $charset,
        body: (string)file_get_contents(dirname(__DIR__, levels: 2)."/fixtures/pages/{$fixture}.html"),
    );
}

test('an article page yields its Open Graph metadata and readable text', function () {
    $parsed = new PageParser()->parse(page('article'));

    expect($parsed->title)
        ->toBe('How to raise a sourdough starter')
        ->and($parsed->description)
        ->toBe('A week-long guide to a lively starter, from first flour to first loaf.')
        ->and($parsed->siteName)
        ->toBe('Bake Club')
        ->and($parsed->openGraphType)
        ->toBe('article')
        ->and($parsed->language)
        ->toBe('en')
        ->and($parsed->imageUrl)
        ->toBe('https://bakeclub.example/img/starter.jpg')
        ->and($parsed->faviconUrl)
        ->toBe('https://bakeclub.example/static/favicon.png')
        ->and($parsed->text)
        ->toContain('living culture of wild yeast')
        ->toContain('feed it once a week')
        ->not->toContain('Recipes')
        ->not->toContain('Copyright');
});

test('a bare page falls back to the title tag and the default favicon', function () {
    $parsed = new PageParser()->parse(page('minimal', url: 'https://example.de/seite'));

    expect($parsed->title)
        ->toBe('Nur ein Titel')
        ->and($parsed->description)
        ->toBeNull()
        ->and($parsed->imageUrl)
        ->toBeNull()
        ->and($parsed->language)
        ->toBe('de')
        ->and($parsed->faviconUrl)
        ->toBe('https://example.de/favicon.ico');
});

test('a client-rendered shell has a title and description but no text', function () {
    $parsed = new PageParser()->parse(page('spa-shell'));

    expect($parsed->title)
        ->toBe('App')
        ->and($parsed->description)
        ->toBe('A single page app')
        ->and($parsed->text)
        ->toBeNull();
});

test('latin-1 pages are decoded with the declared charset', function (?string $headerCharset) {
    $parsed = new PageParser()->parse(page('latin1', charset: $headerCharset));

    expect($parsed->title)
        ->toBe('Käse und Brötchen')
        ->and($parsed->description)
        ->toBe('Frühstück für zwei')
        ->and($parsed->text)
        ->toContain('Frühstück am Sonntagmorgen');
})->with([
    'charset from the header' => ['iso-8859-1'],
    'charset from the meta tag' => [null],
]);

test('an unknown charset name falls back to the bytes', function () {
    $parsed = new PageParser()->parse(page('latin1', charset: 'no-such-charset'));

    expect($parsed->title)->not->toBeEmpty();
});

test('broken markup does not throw and unsafe image urls are dropped', function () {
    $parsed = new PageParser()->parse(page('broken'));

    expect($parsed->title)->toBe('Odd title')->and($parsed->imageUrl)->toBeNull();
});

test('metadata is capped', function () {
    $long = str_repeat('é', times: 2000);
    $response = new FetchedResponse(
        url: 'https://example.com/',
        status: 200,
        contentType: 'text/html',
        charset: 'utf-8',
        body: "<html><head><title>{$long}</title><meta property=\"og:description\" content=\"{$long}\"></head><body>x</body></html>",
    );

    $parsed = new PageParser()->parse($response);

    expect(mb_strlen((string)$parsed->title))
        ->toBe(500)
        ->and(mb_strlen((string)$parsed->description))
        ->toBe(1000);
});
