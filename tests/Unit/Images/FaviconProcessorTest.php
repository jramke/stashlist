<?php

declare(strict_types=1);

use App\Images\FaviconProcessor;
use App\Images\InvalidImage;
use App\Storage\Blob;
use Tests\Support\Images;

/**
 * An SVG is drawn by ImageMagick's own renderer, which a build of ImageMagick may not have.
 */
function without_svg_renderer(): bool
{
    return Imagick::queryFormats('MSVG') === [];
}

/**
 * The color of a pixel of a stored icon as red, green, blue and alpha, each 0 to 255.
 *
 * @return array{r: int, g: int, b: int, a: int}
 */
function icon_pixel(Blob $icon, int $x, int $y): array
{
    $picture = new Imagick;
    $picture->readImageBlob($icon->contents);
    $color = $picture->getImagePixelColor($x, $y)->getColor(2);

    return ['r' => (int)$color['r'], 'g' => (int)$color['g'], 'b' => (int)$color['b'], 'a' => (int)$color['a']];
}

/**
 * Whether a pixel is the color, give or take what the lossy webp does to it.
 *
 * @param  array{r: int, g: int, b: int, a: int}  $pixel
 */
function near(array $pixel, int $red, int $green, int $blue): bool
{
    return abs($pixel['r'] - $red) <= 12 && abs($pixel['g'] - $green) <= 12 && abs($pixel['b'] - $blue) <= 12;
}

const BLUE_SQUARE_YELLOW_DOT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="#0000ff"/><circle cx="8" cy="8" r="4" fill="#ffff00"/></svg>';

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

test('what is kept of an .ico is a webp, and not an .ico that is called one', function () {
    // The reader of an .ico is told its format, and a wand writes in the format it was told to read.
    $icon = new FaviconProcessor()->process(Images::ico(16, 32));

    expect(new finfo(FILEINFO_MIME_TYPE)->buffer($icon->contents))->toBe('image/webp');
});

test('what is kept of an svg is a webp, and not an svg that is called one', function () {
    $icon = new FaviconProcessor()->process(BLUE_SQUARE_YELLOW_DOT);

    expect(new finfo(FILEINFO_MIME_TYPE)->buffer($icon->contents))
        ->toBe('image/webp')
        ->and(str_contains($icon->contents, '<svg'))
        ->toBeFalse();
})->skip(without_svg_renderer(...), 'ImageMagick without its SVG renderer');

test('an svg is drawn, as a webp of at most 64 px', function () {
    $icon = new FaviconProcessor()->process(BLUE_SQUARE_YELLOW_DOT);

    expect($icon->mime)
        ->toBe('image/webp')
        ->and([$icon->width, $icon->height])
        ->toBe([64, 64])
        ->and(near(icon_pixel($icon, 32, 32), 255, 255, 0))
        ->toBeTrue()
        ->and(near(icon_pixel($icon, 3, 3), 0, 0, 255))
        ->toBeTrue();
})->skip(without_svg_renderer(...), 'ImageMagick without its SVG renderer');

test('an svg keeps its transparency and its proportions', function () {
    $icon = new FaviconProcessor()->process(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 16"><circle cx="8" cy="8" r="8" fill="#ff0000"/></svg>',
    );

    expect([$icon->width, $icon->height])
        ->toBe([64, 32])
        ->and(icon_pixel($icon, 0, 0)['a'])
        ->toBe(0)
        ->and(icon_pixel($icon, 60, 16)['a'])
        ->toBe(0)
        ->and(near(icon_pixel($icon, 16, 16), 255, 0, 0))
        ->toBeTrue();
})->skip(without_svg_renderer(...), 'ImageMagick without its SVG renderer');

test('an svg that asks for a file of this machine does not get it', function () {
    $path = tempnam(sys_get_temp_dir(), 'icon').'.png';
    file_put_contents($path, Images::make('png', width: 16, height: 16, left: 'red'));

    $svg =
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 16 16">'.
        '<rect width="16" height="16" fill="#0000ff"/>'.
        "<image href=\"{$path}\" width=\"16\" height=\"16\"/>".
        "<image xlink:href=\"file://{$path}\" width=\"16\" height=\"16\"/>".
        "<rect width=\"16\" height=\"16\" style=\"fill:url(file://{$path})\"/>".
        '</svg>';

    try {
        $icon = new FaviconProcessor()->process($svg);
    } finally {
        unlink($path);
    }

    // Blue, everywhere: no red picture of the file was drawn into it.
    foreach ([[1, 1], [32, 32], [62, 62], [10, 50]] as [$x, $y]) {
        expect(near(icon_pixel($icon, $x, $y), 0, 0, 255))->toBeTrue();
    }
})->skip(without_svg_renderer(...), 'ImageMagick without its SVG renderer');

test('an svg of absurd size is drawn at the size of an icon, in no time', function () {
    $started = microtime(true);
    $icon = new FaviconProcessor()->process(
        '<svg xmlns="http://www.w3.org/2000/svg" width="99999" height="99999" viewBox="0 0 99999 99999"><rect width="99999" height="99999" fill="#00ff00"/></svg>',
    );

    expect([$icon->width, $icon->height])
        ->toBe([64, 64])
        ->and(near(icon_pixel($icon, 32, 32), 0, 255, 0))
        ->toBeTrue()
        ->and(microtime(true) - $started)
        ->toBeLessThan(2.0);
})->skip(without_svg_renderer(...), 'ImageMagick without its SVG renderer');

test('what is no icon is refused', function (string $bytes) {
    new FaviconProcessor()->process($bytes);
})
    ->with([
        'an svg that is a script and nothing to draw' => [
            '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        ],
        'an svg that declares an entity' => [
            '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><title>&x;</title><rect width="16" height="16"/></svg>',
        ],
        'an svg with nothing to see' => [
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="none"/></svg>',
        ],
        'an svg that draws nothing in the picture' => [
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="red" opacity="0"/></svg>',
        ],
        'a page that answers for a missing icon' => ['<!doctype html><title>Not found</title>'],
        'a page that is made of an svg' => [
            '<!doctype html><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16"/></svg>',
        ],
        'text' => ['not an image'],
        'nothing' => [''],
    ])
    ->throws(InvalidImage::class);

test('an svg is read although the first thing in the file is a comment that holds an svg', function () {
    // `finfo` takes such a file for HTML.
    $icon = new FaviconProcessor()->process('<!-- <svg width="4" height="4"></svg> -->'.BLUE_SQUARE_YELLOW_DOT);

    expect($icon->width)->toBe(64);
})->skip(without_svg_renderer(...), 'ImageMagick without its SVG renderer');

test('an icon too large to be one, or with too many pixels, is refused before it is decoded', function (string $bytes) {
    new FaviconProcessor()->process($bytes);
})
    ->with([
        'too many bytes' => [fn (): string => str_repeat('x', FaviconProcessor::MAX_BYTES + 1)],
        'too many pixels' => [fn (): string => Images::make('png', width: 2100, height: 2100)],
        'an svg with too many bytes' => [
            fn (): string => (
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><!--'.
                str_repeat('x', 100_000).
                '--><rect width="16" height="16"/></svg>'
            ),
        ],
    ])
    ->throws(InvalidImage::class);
