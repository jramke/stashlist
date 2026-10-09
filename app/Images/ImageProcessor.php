<?php

declare(strict_types=1);

namespace App\Images;

use App\Storage\Blob;
use Imagick;
use ImagickException;
use Intervention\Image\Analyzers\DominantPaletteAnalyzer;
use Intervention\Image\Drivers\Imagick\Driver;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\Exceptions\ImageException;
use Intervention\Image\ImageManager;
use Intervention\Image\Interfaces\ImageInterface;

/**
 * Validates image bytes and derives what the app shows: a 640 px thumbnail, a 1280 px preview (both WebP, all
 * metadata stripped, so no EXIF GPS leaves the original) and up to five dominant colors.
 *
 * The original is not touched; storing it is the caller's business.
 */
final class ImageProcessor
{
    public const MAX_BYTES = 20 * 1024 * 1024;

    public const MAX_PIXELS = 80_000_000;

    /** SVG is not in this list on purpose: it can carry scripts. */
    private const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];

    private const THUMB_WIDTH = 640;

    private const PREVIEW_WIDTH = 1280;

    private const MAX_HEIGHT_FACTOR = 4;

    private const COLOR_COUNT = 5;

    private readonly ImageManager $manager;

    public function __construct()
    {
        // One bad file must not take a worker down: ImageMagick spills to disk instead of growing past these.
        Imagick::setResourceLimit(Imagick::RESOURCETYPE_MEMORY, 256 * 1024 * 1024);
        Imagick::setResourceLimit(Imagick::RESOURCETYPE_MAP, 512 * 1024 * 1024);

        $this->manager = new ImageManager(Driver::class);
    }

    /**
     * @throws InvalidImage
     */
    public function process(string $bytes): ProcessedImage
    {
        $mime = $this->assertAcceptable($bytes);

        try {
            $image = $this->manager->decodeBinary($bytes)->orient();
            $width = $image->width();
            $height = $image->height();

            $preview = $this->derive($image, self::PREVIEW_WIDTH);
            $thumb = $this->derive($image, self::THUMB_WIDTH);

            return new ProcessedImage(
                mime: $mime,
                width: $width,
                height: $height,
                thumb: $thumb,
                preview: $preview,
                colors: $this->colors($image),
            );
        } catch (ImageException|ImagickException) {
            throw InvalidImage::unreadable();
        }
    }

    /**
     * Checks size, type and pixel count before anything is decoded, so a decompression bomb is refused cheaply.
     *
     * @throws InvalidImage
     */
    private function assertAcceptable(string $bytes): string
    {
        if (strlen($bytes) > self::MAX_BYTES) {
            throw InvalidImage::tooLarge(self::MAX_BYTES);
        }

        $mime = new \finfo(FILEINFO_MIME_TYPE)->buffer($bytes);

        if ($mime === false || ! in_array($mime, self::ALLOWED_TYPES, strict: true)) {
            throw InvalidImage::unsupportedType($mime === false ? 'unknown' : $mime);
        }

        $size = getimagesizefromstring($bytes);

        if ($size === false) {
            throw InvalidImage::unreadable();
        }

        if (($size[0] * $size[1]) > self::MAX_PIXELS) {
            throw InvalidImage::tooManyPixels(self::MAX_PIXELS);
        }

        return $mime;
    }

    /**
     * Shrinks the image in place to $width (never enlarging, with a cap on very tall pages) and encodes it as
     * WebP without metadata. Going from the large derivative to the small one keeps the work cheap.
     */
    private function derive(ImageInterface $image, int $width): Blob
    {
        $image->scaleDown(width: $width, height: $width * self::MAX_HEIGHT_FACTOR);

        return new Blob(
            contents: $image->encode(new WebpEncoder(quality: 80, strip: true))->toString(),
            mime: 'image/webp',
            width: $image->width(),
            height: $image->height(),
        );
    }

    /**
     * @return list<array{hex: string, pct: float}>
     */
    private function colors(ImageInterface $image): array
    {
        $image->scaleDown(width: 64, height: 64);

        $palette = new DominantPaletteAnalyzer(self::COLOR_COUNT)->analyze($image);
        $total = max(1, $palette->totalCount());
        $colors = [];

        foreach ($palette as $color) {
            $colors[] = [
                'hex' => $color->toHex(prefix: true),
                'pct' => round($palette->colorCount($color) / $total, precision: 2),
            ];
        }

        return $colors;
    }
}
