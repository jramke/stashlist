<?php

declare(strict_types=1);

namespace App\Images\Svg;

use App\Images\InvalidImage;
use Dom\Element;

/**
 * The picture, written out new: the groups, shapes and svgs inside the svg that an icon is made of, with how each is
 * drawn. A drawing with more in it than an icon has, or nested deeper, is refused.
 */
final class Drawing
{
    private const MAX_ELEMENTS = 1_500;

    private const MAX_DEPTH = 24;

    private int $elements = 0;

    public function __construct(
        private readonly Look $look,
        private readonly float $width,
        private readonly float $height,
    ) {}

    /**
     * What the children of an element come to. An empty group is not written.
     *
     * @throws InvalidImage
     */
    public function children(Element $parent, int $depth): string
    {
        $drawn = '';

        for ($child = $parent->firstElementChild; $child !== null; $child = $child->nextElementSibling) {
            $drawn .= $this->element($child, $depth);
        }

        return $drawn;
    }

    private function element(Element $element, int $depth): string
    {
        if (! Shapes::drawn($element)) {
            return '';
        }

        if ($depth > self::MAX_DEPTH || ++$this->elements > self::MAX_ELEMENTS) {
            throw InvalidImage::unreadable();
        }

        $properties = $this->look->of($element);

        if (($properties['display'] ?? '') === 'none') {
            return '';
        }

        return match ($element->localName) {
            'svg' => $this->nested($element, $properties, $depth),
            'g' => $this->group($element, $properties, $depth),
            default => $this->shape($element, $properties),
        };
    }

    /**
     * An svg inside the svg (a glyph on a tile is often drawn so) is a group that puts its content in place.
     *
     * @param  array<string, string>  $properties
     */
    private function nested(Element $svg, array $properties, int $depth): string
    {
        $placement = Nesting::transform($svg, $this->width, $this->height);
        $inside = $placement === null ? '' : $this->children($svg, $depth + 1);

        return $inside === ''
            ? ''
            : "<g{$this->look->attributes($properties)} transform=\"{$placement}\">{$inside}</g>";
    }

    /**
     * @param  array<string, string>  $properties
     */
    private function group(Element $group, array $properties, int $depth): string
    {
        $inside = $this->children($group, $depth + 1);

        return $inside === ''
            ? ''
            : "<g{$this->look->attributes($properties)}".Shapes::transform($group).">{$inside}</g>";
    }

    /**
     * @param  array<string, string>  $properties
     */
    private function shape(Element $shape, array $properties): string
    {
        $where = Shapes::geometry($shape, $this->width, $this->height);

        return $where === null
            ? ''
            : "<{$shape->localName}{$where}{$this->look->attributes($properties)}".Shapes::transform($shape).'/>';
    }
}
