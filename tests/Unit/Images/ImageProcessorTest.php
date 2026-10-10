<?php

declare(strict_types=1);

use App\Images\ImageProcessor;
use App\Images\InvalidImage;
use Tests\Support\Images;

test('common formats are accepted and turned into webp derivatives', function (string $format, string $mime) {
    $processed = new ImageProcessor()->process(Images::make($format, width: 2000, height: 1000));

    expect($processed->mime)
        ->toBe($mime)
        ->and($processed->width)
        ->toBe(2000)
        ->and($processed->height)
        ->toBe(1000)
        ->and($processed->preview->mime)
        ->toBe('image/webp')
        ->and($processed->preview->width)
        ->toBe(1280)
        ->and($processed->preview->height)
        ->toBe(640)
        ->and($processed->thumb->mime)
        ->toBe('image/webp')
        ->and($processed->thumb->width)
        ->toBe(640)
        ->and($processed->thumb->height)
        ->toBe(320)
        ->and(new finfo(FILEINFO_MIME_TYPE)->buffer($processed->thumb->contents))
        ->toBe('image/webp');
})->with([
    'jpeg' => ['jpeg', 'image/jpeg'],
    'png' => ['png', 'image/png'],
    'gif' => ['gif', 'image/gif'],
    'webp' => ['webp', 'image/webp'],
    // What a phone saves: PHP cannot read its size, ImageMagick can.
    'heic' => ['heic', 'image/heic'],
]);

test('small images are not enlarged', function () {
    $processed = new ImageProcessor()->process(Images::make('png', width: 100, height: 50));

    expect($processed->thumb->width)
        ->toBe(100)
        ->and($processed->preview->width)
        ->toBe(100)
        ->and($processed->preview->height)
        ->toBe(50);
});

test('very tall images are capped in height', function () {
    $processed = new ImageProcessor()->process(Images::make('png', width: 400, height: 12000));

    expect($processed->thumb->height)
        ->toBeLessThanOrEqual(640 * 4)
        ->and($processed->preview->height)
        ->toBeLessThanOrEqual(1280 * 4);
});

test('dominant colors come with their share', function () {
    $processed = new ImageProcessor()->process(Images::make(
        'png',
        width: 400,
        height: 200,
        left: 'red',
        right: 'blue',
    ));

    $hexes = array_column($processed->colors, 'hex');

    expect($hexes)
        ->toContain('#ff0000')
        ->toContain('#0000ff')
        ->and(array_sum(array_column($processed->colors, 'pct')))
        ->toBeBetween(0.9, 1.0)
        ->and(count($processed->colors))
        ->toBeLessThanOrEqual(5);

    foreach ($processed->colors as $color) {
        expect($color['pct'])->toBeBetween(0.4, 0.6);
    }
});

test('exif gps data does not survive in the derivatives', function () {
    $original = Images::jpegWithGps();

    expect($original)->toContain('Exif');

    $processed = new ImageProcessor()->process($original);

    foreach ([$processed->thumb, $processed->preview] as $derivative) {
        expect($derivative->contents)->not->toContain('EXIF')->not->toContain('Exif')->not->toContain('GPS');

        $image = new Imagick;
        $image->readImageBlob($derivative->contents);
        expect($image->getImageProfiles('exif'))->toBeEmpty();
    }
});

test('files that are not accepted images are refused with a reason', function (string $bytes, string $reason) {
    try {
        new ImageProcessor()->process($bytes);
        $this->fail('Expected InvalidImage.');
    } catch (InvalidImage $exception) {
        expect($exception->reason)->toBe($reason);
    }
})->with([
    'svg' => [
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>',
        'unsupported_type',
    ],
    'pdf' => ["%PDF-1.4\n1 0 obj\n<<>>\nendobj\n", 'unsupported_type'],
    'plain text' => ['hello world', 'unsupported_type'],
    'jpeg header with garbage' => ["\xFF\xD8\xFF\xE0".str_repeat('garbage', times: 20), 'image_unreadable'],
]);

test('an oversized file is refused before it is looked at', function () {
    expect(fn () => new ImageProcessor()->process(str_repeat('a', times: ImageProcessor::MAX_BYTES + 1)))
        ->toThrow(InvalidImage::class, 'larger than');
});

test('an image with too many pixels is refused without decoding it', function () {
    $png = Images::make('png', width: 1, height: 1);
    // The IHDR chunk starts at byte 16 with width and height as 32-bit big-endian numbers.
    $bomb = substr($png, offset: 0, length: 16).pack('NN', 10_000, 10_000).substr($png, offset: 24);

    try {
        new ImageProcessor()->process($bomb);
        $this->fail('Expected InvalidImage.');
    } catch (InvalidImage $exception) {
        expect($exception->reason)->toBe('image_too_many_pixels');
    }
});

test('a file that only claims to be heic is unreadable', function () {
    $fake = substr(Images::make('heic', width: 20, height: 20), 0, 40);

    expect(fn () => new ImageProcessor()->mime($fake))->toThrow(InvalidImage::class);
});
