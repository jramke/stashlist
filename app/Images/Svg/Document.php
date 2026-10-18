<?php

declare(strict_types=1);

namespace App\Images\Svg;

use App\Images\InvalidImage;
use Dom\Element;
use Dom\XMLDocument;
use DOMException;

/**
 * The bytes of an SVG read into a tree, or refused: too many bytes, a text that is not UTF-8, a document that declares
 * an entity, anything that is not an svg.
 */
final class Document
{
    public const SVG = 'http://www.w3.org/2000/svg';

    public const MAX_BYTES = 100_000;

    /**
     * The svg element of the document.
     *
     * @throws InvalidImage
     */
    public static function root(string $svg): Element
    {
        if (strlen($svg) > self::MAX_BYTES) {
            throw InvalidImage::tooLarge(self::MAX_BYTES);
        }

        // An entity is how a document reads a file or grows to gigabytes, and no icon needs one: a document that
        // declares one is not read at all. Only UTF-8 is read, since another encoding could hide the word.
        if (
            trim($svg) === '' ||
            ! mb_check_encoding($svg, encoding: 'UTF-8') ||
            str_contains($svg, "\0") ||
            stripos($svg, needle: '<!ENTITY') !== false
        ) {
            throw InvalidImage::unreadable();
        }

        try {
            $document = XMLDocument::createFromString(
                $svg,
                LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING,
                overrideEncoding: 'UTF-8',
            );
        } catch (DOMException) {
            throw InvalidImage::unreadable();
        }

        $root = $document->documentElement;

        if (
            $root === null ||
            $root->localName !== 'svg' ||
            $root->namespaceURI !== self::SVG ||
            ($document->doctype?->entities->length ?? 0) > 0
        ) {
            throw InvalidImage::unreadable();
        }

        return $root;
    }
}
