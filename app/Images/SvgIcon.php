<?php

declare(strict_types=1);

namespace App\Images;

use App\Storage\Blob;
use Imagick;
use ImagickException;
use ImagickPixel;

/**
 * An SVG icon as a picture. The SVG is never handed to ImageMagick as it came (it can name files and addresses, declare
 * entities and carry scripts): `SvgSanitizer` writes a plain copy out of it, and that copy is drawn by ImageMagick's
 * own renderer, the same on every installation, and not by whatever else the installation has for SVG (librsvg, a
 * program it calls). What is stored is the picture, never the SVG.
 */
final class SvgIcon
{
    /**
     * An SVG starts with `<svg`, after an XML declaration, a doctype and comments if it has them. What `finfo` says of
     * such a file depends on what the first comment holds (one that holds an `<svg` is HTML to it), so the file is looked
     * at here.
     */
    private const START = '/\A(?:\xEF\xBB\xBF)?\s*(?:<\?xml\b[^>]*>\s*)?(?:<!--.*?-->\s*|<!DOCTYPE\b[^>]*>\s*)*<svg[\s>]/s';

    public static function is(string $bytes): bool
    {
        return preg_match(self::START, $bytes) === 1;
    }

    /**
     * @throws InvalidImage
     */
    public static function process(string $bytes): Blob
    {
        // An ImageMagick without its own renderer is no reason to try another one.
        if (Imagick::queryFormats('MSVG') === []) {
            throw InvalidImage::unsupportedType('image/svg+xml');
        }

        try {
            $icon = new Imagick;
            $icon->setBackgroundColor(new ImagickPixel('transparent'));
            $icon->setFormat('msvg');
            $icon->readImageBlob(SvgSanitizer::clean($bytes));

            // What the sanitizer left out can leave nothing to see: a blank icon is worse than the letter.
            if ((float)$icon->getImageChannelRange(Imagick::CHANNEL_ALPHA)['maxima'] <= 0) {
                throw InvalidImage::unreadable();
            }

            return IconWebp::from($icon);
        } catch (ImagickException) {
            throw InvalidImage::unreadable();
        }
    }
}
