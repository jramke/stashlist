<?php

declare(strict_types=1);

namespace App\Images;

use App\Storage\Blob;
use Imagick;

/**
 * The stored form of the icon of a site: a picture of at most 64 px, as WebP without metadata.
 */
final class IconWebp
{
    private const SIZE = 64;

    /**
     * @throws \ImagickException
     */
    public static function from(Imagick $picture): Blob
    {
        if ($picture->getImageWidth() > self::SIZE || $picture->getImageHeight() > self::SIZE) {
            $picture->thumbnailImage(self::SIZE, self::SIZE, bestfit: true);
        }

        // The wand writes in the format it was told to read ("msvg", "ico"), whatever the image says: tell it.
        $picture->setFormat('webp');
        $picture->setImageFormat('webp');
        $picture->setImageCompressionQuality(85);
        $picture->stripImage();

        return new Blob(
            contents: $picture->getImageBlob(),
            mime: 'image/webp',
            width: $picture->getImageWidth(),
            height: $picture->getImageHeight(),
        );
    }
}
