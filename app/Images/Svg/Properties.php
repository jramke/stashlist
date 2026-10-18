<?php

declare(strict_types=1);

namespace App\Images\Svg;

use Dom\Element;

/**
 * What an element says about how it is drawn: its attributes, then the style sheet, then its `style` attribute, the later
 * over the earlier, with the variables filled in. Only the names of the list are read; whatever else an element
 * carries is never looked at.
 */
final readonly class Properties
{
    private const NAMES = [
        'fill',
        'stroke',
        'fill-opacity',
        'stroke-opacity',
        'opacity',
        'fill-rule',
        'clip-rule',
        'stroke-width',
        'stroke-linecap',
        'stroke-linejoin',
        'clip-path',
        'display',
        'stop-color',
    ];

    public function __construct(
        private Styles $styles,
    ) {}

    /**
     * @return array<string, string>
     */
    public function of(Element $element): array
    {
        $attributes = [];

        foreach (self::NAMES as $name) {
            $attributes[$name] = $element->getAttribute($name);
        }

        $said = [
            ...array_filter($attributes, is_string(...)),
            ...$this->styles->for($element),
            ...Css::declarations((string)$element->getAttribute('style')),
        ];
        $found = [];

        foreach (self::NAMES as $name) {
            $value = $this->styles->variables->resolve($said[$name] ?? '');

            if ($value !== null) {
                $found[$name] = $value;
            }
        }

        return $found;
    }
}
