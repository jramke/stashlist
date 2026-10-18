<?php

declare(strict_types=1);

namespace App\Images\Svg;

use Dom\Element;

/**
 * The shapes an icon is made of, and where each is: the lengths that place it, or its path or its points. Every
 * number is checked, and a shape that has no data to draw is no shape.
 */
final class Shapes
{
    /** The shapes, with the lengths that place each. A path and the two kinds of polygon have their own data. */
    private const PLACED_BY = [
        'rect' => ['x', 'y', 'width', 'height', 'rx', 'ry'],
        'circle' => ['cx', 'cy', 'r'],
        'ellipse' => ['cx', 'cy', 'rx', 'ry'],
        'line' => ['x1', 'y1', 'x2', 'y2'],
        'path' => [],
        'polyline' => [],
        'polygon' => [],
    ];

    /**
     * Whether the element is part of the picture: a group, a shape, or an svg inside the svg. Everything else is left
     * out with what is inside it: scripts, images, text, links, filters, masks, patterns, symbols, `use`, the
     * definitions, and whatever another namespace brought.
     */
    public static function drawn(Element $element): bool
    {
        return (
            $element->namespaceURI === Document::SVG &&
            in_array($element->localName, ['g', 'svg', ...array_keys(self::PLACED_BY)], strict: true)
        );
    }

    /**
     * The attributes that place a shape, or null for a shape that has no data to draw. A length in percent is a part of
     * the picture's width, or of its height for the lengths that run down (`y`, `cy`, `height`, ...).
     */
    public static function geometry(Element $shape, float $width, float $height): ?string
    {
        $where = '';

        foreach (self::PLACED_BY[$shape->localName] ?? [] as $name) {
            $text = trim((string)$shape->getAttribute($name));
            $percent = str_ends_with($text, '%');
            $length = Value::number($percent ? substr($text, offset: 0, length: -1) : $text);
            $of = str_contains($name, 'y') || $name === 'height' ? $height : $width;
            $where .= $length === null
                ? ''
                : " {$name}=\"".Value::format($percent ? ($length * $of) / 100 : $length).'"';
        }

        $data = match ($shape->localName) {
            'path' => ['d', Value::checked($shape->getAttribute('d'), Value::PATH, longest: 50_000)],
            'polyline', 'polygon' => [
                'points',
                Value::checked($shape->getAttribute('points'), Value::POINTS, longest: 20_000),
            ],
            default => ['', ''],
        };

        return $data[1] === null ? null : $where.($data[0] === '' ? '' : " {$data[0]}=\"{$data[1]}\"");
    }

    /**
     * The `transform` attribute of an element, written out new, or nothing.
     */
    public static function transform(Element $element): string
    {
        $transform = Value::checked($element->getAttribute('transform'), Value::TRANSFORMS, longest: 200);

        return $transform === null ? '' : " transform=\"{$transform}\"";
    }
}
