<?php

declare(strict_types=1);

use App\Extraction\PageIcons;
use Dom\HTMLDocument;

function icons_of(string $head, string $base = 'https://example.com/blog/post'): array
{
    return PageIcons::of(HTMLDocument::createFromString("<!doctype html><head>{$head}</head>", LIBXML_NOERROR), $base);
}

test('an svg comes after every picture, even a smaller one, and keeps the order of the page among svgs', function () {
    $icons = icons_of(
        '<link rel="icon" href="/a.svg" type="image/svg+xml">'.
        '<link rel="icon" href="/small.png" sizes="16x16">'.
        '<link rel="icon" href="/b.svg?v=2">'.
        '<link rel="apple-touch-icon" href="/touch.png" sizes="180x180">',
    );

    expect($icons)->toBe([
        'https://example.com/touch.png',
        'https://example.com/small.png',
        'https://example.com/a.svg',
        'https://example.com/b.svg?v=2',
    ]);
});

test('a page whose only icon is an svg declares it', function () {
    expect(icons_of('<link rel="icon" type="image/svg+xml" href="favicon.svg">'))->toBe([
        'https://example.com/blog/favicon.svg',
    ]);
});

test('an svg is known by its type as well as by its address', function () {
    expect(icons_of('<link rel="icon" href="/icon" type="image/svg+xml"><link rel="icon" href="/real.png">'))->toBe([
        'https://example.com/real.png',
        'https://example.com/icon',
    ]);
});

test('the mask icon is no icon of the page, and an address that is no web address is not kept', function () {
    expect(icons_of(
        '<link rel="mask-icon" href="/mask.svg" color="#000">'.
        '<link rel="icon" href="javascript:alert(1)">'.
        '<link rel="icon" href="data:image/svg+xml;base64,PHN2Zy8+">',
    ))->toBeEmpty();
});
