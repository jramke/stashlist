<?php

declare(strict_types=1);

namespace App\Images\Svg;

use Dom\Element;

/**
 * The gradients of an svg, each as the one color it comes to (ImageMagick's own renderer draws no gradient): the mean of
 * the colors of its stops. A gradient that takes its stops from another is read through it; stops with the name of a
 * color, which cannot be averaged, are stood for by the first.
 */
final class Gradients
{
    private const XLINK = 'http://www.w3.org/1999/xlink';

    private const MAX_STOPS = 20;

    /** @var array<string, Element> */
    private array $found = [];

    /** @var array<string, string|null> */
    private array $colors = [];

    public function __construct(
        Element $root,
        private readonly Properties $properties,
    ) {
        foreach (['linearGradient', 'radialGradient'] as $kind) {
            foreach ($root->getElementsByTagNameNS(Document::SVG, $kind) as $gradient) {
                $this->found[(string)$gradient->getAttribute('id')] ??= $gradient;
            }
        }
    }

    public function color(string $id, int $hops = 0): ?string
    {
        if (array_key_exists($id, $this->colors)) {
            return $this->colors[$id];
        }

        $gradient = $this->found[$id] ?? null;

        if ($gradient === null || $hops > 3) {
            return null;
        }

        return $this->colors[$id] = $this->mean($gradient, $hops);
    }

    private function mean(Element $gradient, int $hops): ?string
    {
        $colors = [];

        for ($stop = $gradient->firstElementChild; $stop !== null; $stop = $stop->nextElementSibling) {
            if ($stop->localName !== 'stop' || count($colors) >= self::MAX_STOPS) {
                continue;
            }

            $colors[] = $this->properties->of($stop)['stop-color'] ?? '#000000';
        }

        if ($colors === []) {
            $link = (string)($gradient->getAttribute('href') ?? $gradient->getAttributeNS(self::XLINK, 'href'));

            return str_starts_with($link, '#') ? $this->color(substr($link, offset: 1), $hops + 1) : null;
        }

        $rgb = array_values(array_filter(array_map(Color::rgb(...), $colors)));

        if (count($rgb) !== count($colors)) {
            return Color::of($colors[0]);
        }

        $mean = static fn (int $channel): int => (int)round(array_sum(array_column($rgb, $channel)) / count($rgb));

        return sprintf('#%02x%02x%02x', $mean(0), $mean(1), $mean(2));
    }
}
