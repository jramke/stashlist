<?php

declare(strict_types=1);

namespace Tests\Support;

use Imagick;
use ImagickPixel;

/**
 * Real image bytes for tests, made with Imagick.
 */
final class Images
{
    /**
     * An image of one color, or split in two halves, in the given format.
     */
    public static function make(
        string $format,
        int $width,
        int $height,
        string $left = 'red',
        ?string $right = null,
    ): string {
        $image = new Imagick;
        $image->newImage($width, $height, new ImagickPixel($left));

        if ($right !== null) {
            $middle = $width >> 1;
            $top = 0;
            $half = new Imagick;
            $half->newImage($middle, $height, new ImagickPixel($right));
            $image->compositeImage($half, Imagick::COMPOSITE_OVER, $middle, $top);
        }

        $image->setImageFormat($format);

        return $image->getImageBlob();
    }

    /**
     * A JPEG with a minimal EXIF block that carries a GPS latitude.
     */
    public static function jpegWithGps(): string
    {
        $rational = static fn (int $numerator): string => pack('VV', $numerator, 1);

        $tiff =
            'II'.
            pack('vV', 0x2A, 8)
            // IFD0: one entry, the pointer to the GPS IFD at offset 26.
            .pack('v', 1).
            pack('vvVV', 0x8825, 4, 1, 26).
            pack('V', 0)
            // GPS IFD: latitude reference "N" and latitude 52 31 0, the rationals follow at offset 56.
            .pack('v', 2).
            pack('vvV', 0x0001, 2, 2).
            "N\0\0\0".
            pack('vvVV', 0x0002, 5, 3, 56).
            pack('V', 0).
            $rational(52).
            $rational(31).
            $rational(0);

        $image = new Imagick;
        $image->newImage(200, 100, new ImagickPixel('green'));
        $image->setImageFormat('jpeg');
        $image->profileImage('exif', "Exif\0\0".$tiff);

        return $image->getImageBlob();
    }
}
