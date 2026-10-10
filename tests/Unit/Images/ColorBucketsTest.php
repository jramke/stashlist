<?php

declare(strict_types=1);

use App\Enums\ColorName;
use App\Images\ColorBuckets;

test('a color is filed under the name a person would give it', function (string $hex, ColorName $name) {
    expect(ColorBuckets::nameOf($hex))->toBe($name);
})->with([
    ['#e63946', ColorName::Red],
    ['#ff0000', ColorName::Red],
    ['#f77f00', ColorName::Orange],
    ['#facc15', ColorName::Yellow],
    ['#ffff00', ColorName::Yellow],
    ['#2a9d8f', ColorName::Teal],
    ['#00ff00', ColorName::Green],
    ['#3a5a40', ColorName::Green],
    ['#1d4ed8', ColorName::Blue],
    ['#0000ff', ColorName::Blue],
    ['#7c3aed', ColorName::Purple],
    ['#ec4899', ColorName::Pink],
    ['#ffc0cb', ColorName::Pink],
    ['#6b4423', ColorName::Brown],
    ['#8b5a2b', ColorName::Brown],
    ['#000000', ColorName::Black],
    ['#101010', ColorName::Black],
    ['#ffffff', ColorName::White],
    ['#f5f5f5', ColorName::White],
    ['#808080', ColorName::Gray],
    ['#9a9a9a', ColorName::Gray],
    ['808080',  ColorName::Gray],
]);

test('something that is not a hex color has no name', function () {
    expect(ColorBuckets::nameOf('red'))->toBeNull()->and(ColorBuckets::nameOf('#12345'))->toBeNull();
});

test('a picture is filed under its strongest colors, the strongest first, without repeats', function () {
    $names = ColorBuckets::names([
        ['hex' => '#ffffff', 'pct' => 0.15],
        ['hex' => '#e63946', 'pct' => 0.5],
        ['hex' => '#d00000', 'pct' => 0.2],
        ['hex' => '#1d4ed8', 'pct' => 0.05],
        ['hex' => '#010101', 'pct' => 0.1],
    ]);

    expect($names)->toBe([ColorName::Red, ColorName::White, ColorName::Black]);
});

test('the strongest color always counts, even when it is a small share', function () {
    expect(ColorBuckets::names([['hex' => '#1d4ed8', 'pct' => 0.08], ['hex' => '#e63946', 'pct' => 0.05]]))
        ->toBe([ColorName::Blue]);
});

test('no colors, no names', function () {
    expect(ColorBuckets::names(null))->toBeEmpty()->and(ColorBuckets::names([]))->toBeEmpty();
});
