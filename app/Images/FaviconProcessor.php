<?php

declare(strict_types=1);

namespace App\Images;

use App\Storage\Blob;
use finfo;
use Imagick;
use ImagickException;

/**
 * Makes the icon of a site small: the largest picture in the file, at most 64 px, as WebP without metadata. The
 * icon comes from the site itself, so it is as untrusted as any file from the web: only the formats of an icon are
 * read. An SVG is a drawing, and has its own way in (`SvgIcon`): it is never read as it came.
 */
final class FaviconProcessor
{
    public const MAX_BYTES = 512 * 1024;

    private const MAX_PIXELS = 4_000_000;

    private const PICTURES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

    private const ICONS = ['image/x-icon', 'image/vnd.microsoft.icon'];

    /**
     * @throws InvalidImage
     */
    public function process(string $bytes): Blob
    {
        if (SvgIcon::is($bytes)) {
            return SvgIcon::process($bytes);
        }

        $mime = $this->check($bytes);

        try {
            $icon = new Imagick;

            // ImageMagick does not know an .ico by its first bytes: it has to be told.
            if (in_array($mime, self::ICONS, strict: true)) {
                $icon->setFormat('ico');
            }

            $icon->readImageBlob($bytes);
            // An .ico holds several pictures: take the largest.
            $largest = 0;
            $index = 0;

            foreach ($icon as $position => $frame) {
                if ($frame->getImageWidth() <= $largest) {
                    continue;
                }

                $largest = $frame->getImageWidth();
                $index = $position;
            }

            $icon->setIteratorIndex($index);

            return IconWebp::from($icon->getImage());
        } catch (ImagickException) {
            throw InvalidImage::unreadable();
        }
    }

    /**
     * Size, type and pixel count are checked before anything is decoded.
     *
     * @return string the type of the bytes
     *
     * @throws InvalidImage
     */
    private function check(string $bytes): string
    {
        if (strlen($bytes) > self::MAX_BYTES) {
            throw InvalidImage::tooLarge(self::MAX_BYTES);
        }

        $mime = new finfo(FILEINFO_MIME_TYPE)->buffer($bytes);

        if (
            $mime === false ||
            ! (in_array($mime, self::PICTURES, strict: true) || in_array($mime, self::ICONS, strict: true))
        ) {
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
}
