<?php

declare(strict_types=1);

use App\Images\InvalidImage;
use App\Images\Svg\Document;
use App\Images\SvgSanitizer;
use Dom\Element;
use Dom\XMLDocument;

/**
 * Hostile documents made at random from a pool of tags, attributes and nasty values. Whatever goes in, what comes out
 * is checked here by a list of its own: the allowed tags, and for each attribute the pattern its value has to match.
 * This list is written out a second time on purpose: it is the contract of the sanitizer, kept apart from the code that
 * keeps it.
 */
const SVG_NUMBER = '-?\d+(?:\.\d+)?';

const SVG_LENGTH = '/^'.SVG_NUMBER.'$/';

const SVG_PAINT = '/^(?:#[0-9a-f]{6}|none|[a-z]{3,20})$/';

const SVG_OPACITY = '/^(?:0|1|0\.\d+)$/';

const SVG_OUTPUT_TAGS = [
    'svg',
    'defs',
    'clipPath',
    'g',
    'rect',
    'circle',
    'ellipse',
    'line',
    'path',
    'polyline',
    'polygon',
];

const SVG_OUTPUT_ATTRIBUTES = [
    'fill' => SVG_PAINT,
    'stroke' => SVG_PAINT,
    'fill-opacity' => SVG_OPACITY,
    'stroke-opacity' => SVG_OPACITY,
    'opacity' => SVG_OPACITY,
    'stroke-width' => '/^\d+(?:\.\d+)?$/',
    'fill-rule' => '/^(?:nonzero|evenodd)$/',
    'clip-rule' => '/^(?:nonzero|evenodd)$/',
    'stroke-linecap' => '/^(?:butt|round|square)$/',
    'stroke-linejoin' => '/^(?:miter|round|bevel)$/',
    'clip-path' => '/^url\(#clip\d+\)$/',
    'id' => '/^clip\d+$/',
    'transform' => '/^(?:(?:matrix|translate|scale|rotate|skewX|skewY)\s*\([0-9eE.,+\-\s]*\)[\s,]*)+$/',
    'd' => '/^[MmZzLlHhVvCcSsQqTtAa0-9eE.,+\-\s]+$/',
    'points' => '/^[0-9eE.,+\-\s]+$/',
    'x' => SVG_LENGTH,
    'y' => SVG_LENGTH,
    'width' => SVG_LENGTH,
    'height' => SVG_LENGTH,
    'rx' => SVG_LENGTH,
    'ry' => SVG_LENGTH,
    'cx' => SVG_LENGTH,
    'cy' => SVG_LENGTH,
    'r' => SVG_LENGTH,
    'x1' => SVG_LENGTH,
    'y1' => SVG_LENGTH,
    'x2' => SVG_LENGTH,
    'y2' => SVG_LENGTH,
];

const SVG_ROOT_ATTRIBUTES = ['xmlns', 'width', 'height', 'viewBox'];

const SVG_WORDS_THAT_MUST_NOT_SURVIVE = [
    'evil',
    'passwd',
    'file:',
    'javascript',
    'onload',
    'onclick',
    'href',
    '@import',
    '<!',
    'http',
];

const SVG_FUZZ_TAGS = [
    'g',
    'g',
    'rect',
    'rect',
    'circle',
    'ellipse',
    'line',
    'path',
    'path',
    'polyline',
    'polygon',
    'svg',
    'defs',
    'clipPath',
    'linearGradient',
    'radialGradient',
    'stop',
    'style',
    'script',
    'image',
    'use',
    'a',
    'text',
    'foreignObject',
    'filter',
    'mask',
    'pattern',
    'symbol',
    'switch',
    'title',
    'animate',
    'set',
    'feImage',
    'x:y',
];

const SVG_FUZZ_PAINTS = [
    'red',
    '#fff',
    '#12345678',
    'url(#a)',
    'url(#b) blue',
    'url(http://evil.example/x)',
    'url(file:///etc/passwd) red',
    'var(--c)',
    'currentColor',
    'none',
    'light-dark(red, blue)',
    'rgb(1,2,3)',
    'rgb(1 2 3 / 50%)',
    '" onload="alert(1)',
    'javascript:alert(1)',
    'inherit',
    'url',
    'calc',
];

const SVG_FUZZ_NUMBERS = ['0', '8', '16', '-3', '2.5', '1e30', '99999999', '100%', '50%', 'abc', '', '1px', '4; evil'];

const SVG_FUZZ_STYLES = [
    'rect { fill: #00f }',
    '@import url(http://evil.example/a.css);',
    ':root { --c: #f00 }',
    '.a { fill: var(--c) }',
    '#a { stroke: url(file:///etc/passwd) }',
    '@media (prefers-color-scheme: dark) { rect { fill: #fff } }',
    '* { fill: url(http://evil.example) }',
    'path { stroke: #000; stroke-width: 1e30 }',
    'g > rect { fill: red }',
    '@font-face { src: url(http://evil.example/f.woff) }',
];

/**
 * @return array<string, list<string>> the values an attribute may be given, by its name
 */
function svg_fuzz_attributes(): array
{
    return [
        'fill' => SVG_FUZZ_PAINTS,
        'stroke' => SVG_FUZZ_PAINTS,
        'stop-color' => SVG_FUZZ_PAINTS,
        'd' => ['M0 0L5 5z', 'M0 0h4v4z', 'M0 0 L1e30 1e30', 'M0 0" onload="x', 'M0 0 image 1', 'M1 1 evil', ''],
        'points' => ['0,0 4,4 8,0', '0,0 evil', '1e9,1e9', ''],
        'transform' => [
            'translate(1 2)',
            'scale(1e9)',
            'rotate(45) translate(1,1)',
            'translate(1 2); evil',
            'matrix(1 0 0 1 0 0)',
            '',
        ],
        'clip-path' => ['url(#a)', 'url(#b)', 'url(#c)', 'url(http://evil.example/c)'],
        'style' => [
            'fill:red',
            'fill:url(http://evil.example/a); stroke:#000',
            'display:none',
            'background:url(file:///etc/passwd)',
            'fill:var(--c)',
            'stroke:blue;stroke-width:2',
            'opacity:0.5',
        ],
        'class' => ['a', 'b', 'a b'],
        'id' => ['a', 'b', 'c', 'clip0', '"><script>'],
        'href' => ['http://evil.example/x', 'file:///etc/passwd', '#a', 'javascript:alert(1)'],
        'xlink:href' => ['http://evil.example/x', 'file:///etc/passwd', '#a', '#b'],
        'onclick' => ['alert(1)'],
        'onload' => ['alert(1)'],
        'filter' => ['url(#f)'],
        'mask' => ['url(#m)'],
        'viewBox' => ['0 0 16 16', '0 0 0 0', '1 2 3', '0 0 99999999 1', '-5 -5 20 20'],
        'display' => ['none', 'inline'],
        'opacity' => ['0.5', '50%', '2', '-1', 'calc(1 + 1)'],
        'stroke-width' => ['1', '2px', '-3', '1e30', 'abc'],
        'fill-rule' => ['evenodd', 'nonzero', 'evil; x'],
        'stroke-linecap' => ['round', 'evil'],
        'offset' => ['0', '1', '50%'],
        ...array_fill_keys(['x', 'y', 'width', 'height', 'rx', 'cx', 'cy', 'r', 'x1'], SVG_FUZZ_NUMBERS),
    ];
}

/**
 * @template T
 *
 * @param  non-empty-list<T>  $pool
 * @return T
 */
function svg_pick(array $pool): mixed
{
    return $pool[mt_rand(0, count($pool) - 1)];
}

function svg_random_element(int $depth): string
{
    $attributes = svg_fuzz_attributes();
    $tag = svg_pick(SVG_FUZZ_TAGS);
    $attrs = '';

    foreach ((array)array_rand($attributes, mt_rand(1, 6)) as $name) {
        $attrs .= ' '.$name.'="'.htmlspecialchars((string)svg_pick($attributes[$name])).'"';
    }

    $inside = $tag === 'style' ? svg_pick(SVG_FUZZ_STYLES) : '';

    for ($i = $depth > 0 ? mt_rand(0, 4) : 0; $i > 0; $i--) {
        $inside .= svg_random_element($depth - 1);
    }

    return $tag === 'x:y'
        ? "<x:y xmlns:x=\"urn:evil\"{$attrs}>{$inside}</x:y>"
        : "<{$tag}{$attrs}>{$inside}</{$tag}>";
}

/**
 * What is wrong with an attribute of the output, if anything: it is not on the list, or its value is not of its shape.
 */
function svg_attribute_problem(Element $element, Element $root, string $name, string $value): ?string
{
    $isRoot = $element === $root;
    $allowed = $isRoot
        ? in_array($name, SVG_ROOT_ATTRIBUTES, strict: true)
        : array_key_exists($name, SVG_OUTPUT_ATTRIBUTES);

    return $allowed && ($isRoot || preg_match(SVG_OUTPUT_ATTRIBUTES[$name], $value) === 1)
        ? null
        : "attribute {$name}=\"{$value}\" on {$element->nodeName}";
}

/**
 * Every tag and attribute of the output is on the list, with a value of the shape of its kind.
 *
 * @return list<string> what is wrong
 */
function svg_output_problems(string $output): array
{
    $problems = [];
    $root = XMLDocument::createFromString($output, LIBXML_NONET)->documentElement;
    $elements = array_filter(
        [$root, ...iterator_to_array($root?->getElementsByTagName('*') ?? [], preserve_keys: false)],
        static fn (mixed $element): bool => $element instanceof Element,
    );

    foreach ($elements as $element) {
        if (
            ! in_array($element->localName, SVG_OUTPUT_TAGS, strict: true) ||
            $element->namespaceURI !== Document::SVG
        ) {
            $problems[] = "tag {$element->nodeName}";
        }

        foreach ($element->attributes as $attribute) {
            $problems[] = svg_attribute_problem($element, $root, $attribute->name, $attribute->value);
            $numbers = [];
            preg_match_all('/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/', $attribute->value, $numbers);

            foreach (array_filter(
                $numbers[0],
                static fn (string $number): bool => abs((float)$number) > 1_000_000,
            ) as $number) {
                $problems[] = $attribute->name === 'id' ? null : "number {$number} in {$attribute->name}";
            }
        }
    }

    $words = str_replace(Document::SVG, '', $output);

    foreach (SVG_WORDS_THAT_MUST_NOT_SURVIVE as $word) {
        $problems[] = str_contains($words, $word) ? "the word {$word}" : null;
    }

    return array_values(array_filter($problems));
}

test('whatever a document holds, what comes out is made of the allowed tags and values only', function () {
    mt_srand(20261018);
    $written = 0;

    for ($round = 0; $round < 600; $round++) {
        $svg =
            '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 16 16">'.
            svg_random_element(depth: 3).
            svg_random_element(depth: 3).
            '</svg>';

        try {
            $output = SvgSanitizer::clean($svg);
        } catch (InvalidImage) {
            continue;
        }

        $written++;

        expect(svg_output_problems($output))->toBeEmpty();
    }

    // The pool is not so hostile that nothing comes out: many documents are read, in part.
    expect($written)->toBeGreaterThan(100);
});

test('the check finds what it is meant to find', function (string $inside) {
    $output = '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 16 16">'.$inside.'</svg>';

    expect(svg_output_problems($output))->not->toBeEmpty();
})->with([
    'a script' => ['<script/>'],
    'an event handler' => ['<g onclick="x"/>'],
    'an address' => ['<rect fill="url(http://example.com/a)"/>'],
    'a link' => ['<path d="M0 0" href="#a"/>'],
    'a number that is too large' => ['<rect width="9999999"/>'],
    'a paint of words' => ['<rect fill="red; evil"/>'],
    'an image' => ['<image/>'],
]);
