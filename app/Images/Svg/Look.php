<?php

declare(strict_types=1);

namespace App\Images\Svg;

use Dom\Element;

/**
 * How an element is drawn, written out as new attributes: a paint, a number or a word of the list, nothing else.
 */
final readonly class Look
{
    private const KEYWORDS = [
        'fill-rule' => '/^(?:nonzero|evenodd)$/',
        'clip-rule' => '/^(?:nonzero|evenodd)$/',
        'stroke-linecap' => '/^(?:butt|round|square)$/',
        'stroke-linejoin' => '/^(?:miter|round|bevel)$/',
    ];

    public function __construct(
        private Properties $properties,
        private Paint $paint,
        private Clips $clips,
    ) {}

    /**
     * @return array<string, string>
     */
    public function of(Element $element): array
    {
        return $this->properties->of($element);
    }

    /**
     * @param  array<string, string>  $properties
     */
    public function attributes(array $properties): string
    {
        $written = [];

        foreach (self::KEYWORDS as $name => $pattern) {
            $word = strtolower($properties[$name] ?? '');

            if (preg_match($pattern, $word) === 1) {
                $written[$name] = $word;
            }
        }

        foreach (['fill', 'stroke'] as $name) {
            $written[$name] = $this->paint->of($properties[$name] ?? '');
        }

        foreach (['fill-opacity', 'stroke-opacity', 'opacity'] as $name) {
            $written[$name] = Value::opacity($properties[$name] ?? null);
        }

        $width = Value::number($properties['stroke-width'] ?? null);
        $written['stroke-width'] = $width === null || $width < 0 ? null : Value::format($width);
        $written['clip-path'] = $this->clips->reference($properties['clip-path'] ?? '');

        // The renderer starts with a stroke that is not opaque, so a stroke that says nothing about it is not seen.
        if (($written['stroke'] ?? 'none') !== 'none') {
            $written['stroke-opacity'] ??= '1';
        }

        return implode('', array_map(
            static fn (string $name, string $value): string => " {$name}=\"{$value}\"",
            array_keys(array_filter($written, is_string(...))),
            array_filter($written, is_string(...)),
        ));
    }
}
