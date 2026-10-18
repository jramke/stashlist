<?php

declare(strict_types=1);

namespace App\Images;

use App\Images\Svg\Box;
use App\Images\Svg\Clips;
use App\Images\Svg\Document;
use App\Images\Svg\Drawing;
use App\Images\Svg\Gradients;
use App\Images\Svg\Look;
use App\Images\Svg\Paint;
use App\Images\Svg\Properties;
use App\Images\Svg\Styles;
use App\Images\Svg\Value;
use Dom\Element;

/**
 * Makes an untrusted SVG into a plain one that ImageMagick's own renderer draws without reading anything. Nothing of the
 * document is cleaned and kept: a new document is written out of what an allowlist names (shapes, paths, groups, clip
 * paths, flat colors, transforms), every value of it checked again (`App\Images\Svg`), so no script, no reference to
 * another file or address, no entity, no style sheet and no font can pass, and what the document asked for in CSS is
 * already written into the elements. Two things a document may say are drawn more simply than it says them, because
 * the renderer cannot do them: a gradient is the one color it comes to, and the `@media` blocks other than the light
 * scheme are left out. The size is the sanitizer's own (`SIZE` on the longest side, whatever the document claims), and
 * a document with too much in it or too deep is refused.
 */
final class SvgSanitizer
{
    /** The longest side of the picture, in pixels: twice what the icon is kept at, so shrinking smooths the edges. */
    public const SIZE = 128;

    public const MAX_BYTES = Document::MAX_BYTES;

    /**
     * The plain SVG that stands for the document.
     *
     * @throws InvalidImage
     */
    public static function clean(string $svg): string
    {
        $root = Document::root($svg);
        [$minX, $minY, $width, $height] = Box::root($root);

        $properties = new Properties(Styles::from(self::stylesheet($root)));
        $clips = new Clips;
        $look = new Look($properties, new Paint(new Gradients($root, $properties)), $clips);
        $drawing = new Drawing($look, $width, $height);
        $clips->collect($root, static fn (Element $clip): string => $drawing->children($clip, depth: 2));
        $body = $drawing->children($root, depth: 1);

        // A document with nothing in it that can be drawn is no icon.
        if ($body === '') {
            throw InvalidImage::unreadable();
        }

        $scale = self::SIZE / max($width, $height);
        $origin =
            $minX === 0.0 && $minY === 0.0
                ? ''
                : ' transform="translate('.Value::format(-$minX).' '.Value::format(-$minY).')"';

        return sprintf(
            '<svg xmlns="%s" width="%d" height="%d" viewBox="0 0 %s %s">%s<g%s%s>%s</g></svg>',
            Document::SVG,
            max(1, (int)round($width * $scale)),
            max(1, (int)round($height * $scale)),
            Value::format($width),
            Value::format($height),
            $clips->definitions(),
            $look->attributes($look->of($root)),
            $origin,
            $body,
        );
    }

    private static function stylesheet(Element $root): string
    {
        $css = '';

        foreach ($root->getElementsByTagNameNS(Document::SVG, 'style') as $style) {
            $css .= in_array($style->getAttribute('type'), [null, '', 'text/css'], strict: true)
                ? (string)$style->textContent."\n"
                : '';
        }

        return $css;
    }
}
