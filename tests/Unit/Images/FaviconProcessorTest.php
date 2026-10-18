<?php

declare(strict_types=1);

use App\Images\FaviconProcessor;
use App\Images\InvalidImage;
use Tests\Support\Images;

test('an icon is kept as a small webp, and a small one is not enlarged', function (
    string $format,
    int $side,
    int $expected,
) {
    $icon = new FaviconProcessor()->process(Images::make($format, width: $side, height: $side));

    expect($icon->mime)
        ->toBe('image/webp')
        ->and($icon->width)
        ->toBe($expected)
        ->and($icon->height)
        ->toBe($expected)
        ->and(new finfo(FILEINFO_MIME_TYPE)->buffer($icon->contents))
        ->toBe('image/webp');
})->with([
    'a big png comes down to 64' => ['png', 256, 64],
    'a small png stays as it is' => ['png', 32, 32],
    'a jpeg' => ['jpeg', 100, 64],
    'a gif' => ['gif', 16, 16],
    'a webp' => ['webp', 48, 48],
]);

test('an .ico gives its largest picture', function () {
    $icon = new FaviconProcessor()->process(Images::ico(16, 48, 32));

    expect($icon->width)->toBe(48)->and($icon->height)->toBe(48);
});

test('an .ico with one picture is read too', function () {
    expect(new FaviconProcessor()->process(Images::ico(16))->width)->toBe(16);
});

test('what is no icon is refused', function (string $bytes) {
    new FaviconProcessor()->process($bytes);
})
    ->with([
        'svg, which can carry scripts' => ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
        'a page that answers for a missing icon' => ['<!doctype html><title>Not found</title>'],
        'text' => ['not an image'],
        'nothing' => [''],
    ])
    ->throws(InvalidImage::class);

test('an icon too large to be one, or with too many pixels, is refused before it is decoded', function (string $bytes) {
    new FaviconProcessor()->process($bytes);
})
    ->with([
        'too many bytes' => [fn (): string => str_repeat('x', FaviconProcessor::MAX_BYTES + 1)],
        'too many pixels' => [fn (): string => Images::make('png', width: 2100, height: 2100)],
    ])
    ->throws(InvalidImage::class);
