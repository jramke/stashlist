<?php

declare(strict_types=1);

use App\Images\InvalidImage;
use App\Images\SvgSanitizer;

const SVG_NS = 'xmlns="http://www.w3.org/2000/svg"';

function icon_svg(string $inside, string $root = SVG_NS.' viewBox="0 0 16 16"'): string
{
    return "<svg {$root}>{$inside}</svg>";
}

test('a plain svg is written out again, sized by us', function () {
    $svg = icon_svg(
        '<rect x="1" y="1" width="14" height="14" rx="3" fill="#369"/>',
        SVG_NS.' viewBox="0 0 16 16" width="480" height="480"',
    );

    expect(SvgSanitizer::clean($svg))
        ->toBe(
            '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 16 16"><g><rect x="1" y="1" width="14" height="14" rx="3" fill="#336699"/></g></svg>',
        );
});

test('the size is ours, whatever the document claims', function (string $root, string $size) {
    expect(SvgSanitizer::clean(icon_svg('<rect width="1" height="1"/>', $root)))->toContain($size);
})->with([
    'huge width and height' => [
        SVG_NS.' width="999999" height="999999" viewBox="0 0 16 16"',
        'width="128" height="128"',
    ],
    'a wide view box' => [SVG_NS.' viewBox="0 0 32 16"', 'width="128" height="64"'],
    'a tall view box' => [SVG_NS.' viewBox="0 0 16 32"', 'width="64" height="128"'],
    'no view box, a plain size' => [SVG_NS.' width="32" height="16"', 'width="128" height="64" viewBox="0 0 32 16"'],
    'sizes with a unit' => [SVG_NS.' width="16px" height="16px"', 'viewBox="0 0 16 16"'],
    'a view box that does not start at zero' => [
        SVG_NS.' viewBox="200 206 800 790"',
        'width="128" height="126" viewBox="0 0 800 790"',
    ],
]);

test('the start of the view box moves into a transform of the content', function () {
    expect(SvgSanitizer::clean(icon_svg('<rect width="1" height="1"/>', SVG_NS.' viewBox="200 206 800 790"')))
        ->toContain(
            '<g transform="translate(-200 -206)">',
        );
});

test('a size nobody can draw is refused', function (string $root) {
    SvgSanitizer::clean(icon_svg('<rect width="1" height="1"/>', $root));
})
    ->with([
        'no size at all' => [SVG_NS],
        'a size in percent only' => [SVG_NS.' width="100%" height="100%"'],
        'an absurd view box' => [SVG_NS.' viewBox="0 0 1000000000 1000000000"'],
        'an absurd size' => [SVG_NS.' width="1e30" height="1e30"'],
        'a view box with nothing in it' => [SVG_NS.' viewBox="0 0 0 0"'],
        'a negative view box' => [SVG_NS.' viewBox="0 0 -16 -16"'],
        'a view box of words' => [SVG_NS.' viewBox="0 0 wide tall"'],
    ])
    ->throws(InvalidImage::class);

test('scripts, event handlers and links are left out, and what is drawn stays', function () {
    $svg = icon_svg(
        '<script>alert(1)</script>'.
        '<rect width="8" height="8" onclick="alert(2)" fill="red" href="javascript:alert(3)"/>'.
        '<a xlink:href="javascript:alert(4)"><circle cx="4" cy="4" r="3"/></a>'.
        '<foreignObject><iframe xmlns="http://www.w3.org/1999/xhtml" src="https://evil.example/"/></foreignObject>'.
        '<switch><path d="M0 0h4v4z"/></switch>',
        SVG_NS.' xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 16 16" onload="alert(5)"',
    );

    $clean = SvgSanitizer::clean($svg);

    expect($clean)
        ->toContain('<rect width="8" height="8" fill="red"/>')
        ->not->toContain('alert')
        ->not->toContain('script')
        ->not->toContain('onclick')
        ->not->toContain('onload')
        ->not->toContain('javascript')
        ->not->toContain('href')
        ->not->toContain('foreignObject')
        ->not->toContain('iframe')
        ->not->toContain('evil')
        ->not->toContain('<a')
        ->not->toContain('<circle')
        ->not->toContain('<path');
});

test('an image, a use, a filter and every address or file a document names are left out', function () {
    $svg = icon_svg(
        '<style>@import url(http://evil.example/a.css); rect { fill: url(http://evil.example/a.svg#x) } path { background: url(file:///etc/passwd) }</style>'.
        '<image href="http://evil.example/x.png" width="8" height="8"/>'.
        '<image xlink:href="file:///etc/passwd" width="8" height="8"/>'.
        '<use xlink:href="http://evil.example/x.svg#a"/>'.
        '<use href="file:///etc/passwd#a"/>'.
        '<filter id="f"><feImage href="file:///etc/passwd"/></filter>'.
        '<text font-family="evil">words</text>'.
        '<rect width="8" height="8" fill="url(http://evil.example/p.svg#a)" filter="url(#f)" style="fill:url(file:///etc/passwd)"/>'.
        '<path d="M0 0h4v4z" fill="url(file:///etc/passwd) red" mask="url(#m)"/>',
        SVG_NS.' xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 16 16"',
    );

    $clean = SvgSanitizer::clean($svg);

    expect($clean)
        ->toContain('<rect width="8" height="8" fill="none"/>')
        ->toContain('<path d="M0 0h4v4z" fill="red"/>')
        ->not->toContain('evil')
        ->not->toContain('passwd')
        ->not->toContain('file:')
        ->not->toContain('@import')
        ->not->toContain('<image')
        ->not->toContain('<use')
        ->not->toContain('<filter')
        ->not->toContain('<text')
        ->not->toContain('font')
        ->not->toContain('mask')
        ->not->toContain('filter=');
});

test('an entity is refused: it is how a document reads a file or grows to gigabytes', function (string $svg) {
    SvgSanitizer::clean($svg);
})
    ->with([
        'a text entity' => [
            '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY a "AAAA">]><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="&a;"/></svg>',
        ],
        'a file' => [
            '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><title>&x;</title><rect width="1" height="1"/></svg>',
        ],
        'an address' => [
            '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x SYSTEM "http://127.0.0.1/secret">]><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><title>&x;</title><rect width="1" height="1"/></svg>',
        ],
        'a parameter entity' => [
            '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY % p SYSTEM "http://127.0.0.1/x.dtd"> %p;]><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>',
        ],
        'entities that grow' => [
            '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;"><!ENTITY c "&b;&b;&b;&b;&b;&b;&b;&b;&b;&b;">]><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><title>&c;</title><rect width="1" height="1"/></svg>',
        ],
        'a lower case keyword' => [
            '<!DOCTYPE svg [<!entity a "b">]><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>',
        ],
    ])
    ->throws(InvalidImage::class);

test('an ordinary doctype and an xml declaration are read', function () {
    $svg = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="8" height="8"/></svg>';

    expect(SvgSanitizer::clean($svg))->toContain('<rect width="8" height="8"/>');
});

test('what is no svg is refused', function (string $bytes) {
    SvgSanitizer::clean($bytes);
})
    ->with([
        'a page' => ['<!doctype html><title>Not found</title>'],
        'text' => ['not an image'],
        'nothing' => [''],
        'a broken document' => ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path'],
        'another root' => ['<html xmlns="http://www.w3.org/2000/svg"/>'],
        'no namespace' => ['<svg viewBox="0 0 1 1"><rect width="1" height="1"/></svg>'],
        'another namespace' => [
            '<svg xmlns="http://example.com/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>',
        ],
        'another encoding' => [mb_convert_encoding(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>',
            'UTF-16LE',
        )],
        'bytes that are no text' => [
            "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1 1\"><title>\xFF\xFE</title><rect width=\"1\" height=\"1\"/></svg>",
        ],
        'a null byte' => [
            "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1 1\"><rect width=\"1\" height=\"1\"/>\0</svg>",
        ],
    ])
    ->throws(InvalidImage::class);

test('a document with nothing that can be drawn is refused', function (string $inside) {
    SvgSanitizer::clean(icon_svg($inside));
})
    ->with([
        'no content' => [''],
        'a script' => ['<script>alert(1)</script>'],
        'text' => ['<text x="1" y="1">a</text>'],
        'an image' => ['<image href="https://evil.example/a.png" width="8" height="8"/>'],
        'a shape that is hidden' => ['<rect width="8" height="8" style="display:none"/>'],
        'a path without data' => ['<path fill="red"/>'],
        'a group with nothing in it' => ['<g><g/></g>'],
        'only definitions' => ['<defs><rect width="8" height="8"/></defs>'],
    ])
    ->throws(InvalidImage::class);

test('too much, too deep or too long is refused', function (string $svg) {
    SvgSanitizer::clean($svg);
})
    ->with([
        'too many elements' => [fn (): string => icon_svg(str_repeat('<rect width="1" height="1"/>', 1600))],
        'too deep' => [
            fn (): string => icon_svg(str_repeat('<g>', 30).'<rect width="1" height="1"/>'.str_repeat('</g>', 30)),
        ],
        'too many bytes' => [
            fn (): string => icon_svg(
                '<!--'.str_repeat('x', SvgSanitizer::MAX_BYTES).'--><rect width="1" height="1"/>',
            ),
        ],
    ])
    ->throws(InvalidImage::class);

test('a value that is not what its attribute takes is left out, so nothing can be slipped in through one', function (
    string $attribute,
    string $value,
) {
    $attack = icon_svg("<path d=\"M0 0h4v4z\" {$attribute}='".htmlspecialchars($value, ENT_QUOTES)."'/>");
    $plain = icon_svg('<path d="M0 0h4v4z"/>');

    expect(SvgSanitizer::clean($attack))->toBe(SvgSanitizer::clean($plain));
})->with([
    'a paint that closes its quote' => ['fill', 'red" onload="alert(1)'],
    'a paint with commands for the renderer' => ['fill', "red\"\nimage over 0,0 0,0 'ephemeral:/etc/passwd'"],
    'a color name that is a command' => ['fill', 'url'],
    'a stroke of words' => ['stroke', 'javascript:alert(1)'],
    'an opacity of words' => ['opacity', 'calc(1 + 1)'],
    'a width with a second declaration' => ['stroke-width', '1; stroke: red'],
    'a transform that does something else' => ['transform', 'translate(1 2); image over 0,0 0,0 "x"'],
    'a transform too large to mean it' => ['transform', 'scale(1e30)'],
    'a clip rule of words' => ['clip-rule', 'evenodd; fill: red'],
    'a clip path outside the document' => ['clip-path', 'url(http://evil.example/c.svg#c)'],
    'a join of words' => ['stroke-linejoin', 'round; stroke: red'],
]);

test('what a path or a polygon may hold is numbers and commands, and nothing else', function (
    string $tag,
    string $attribute,
    string $value,
) {
    expect(SvgSanitizer::clean(icon_svg("<{$tag} {$attribute}='{$value}'/><rect width=\"1\" height=\"1\"/>")))
        ->not
        ->toContain($tag);
})->with([
    'a path with a quote' => ['path', 'd', 'M0 0" onload="alert(1)'],
    'a path with a word' => ['path', 'd', 'M0 0 image 3'],
    'a path with a number that is too large' => ['path', 'd', 'M0 0 L1e30 1e30'],
    'a polygon with a word' => ['polygon', 'points', '0,0 4,4 evil'],
    'a polyline with a number that is too large' => ['polyline', 'points', '0,0 99999999,4'],
]);

test('the style sheet is written into the elements: tag, class and id, the heavier over the lighter', function () {
    $svg = icon_svg(
        '<style>
            :root { --brand: #112233; }
            path { fill: #ff0000; }
            .a { fill: var(--brand); }
            #b { fill: #00ff00 !important; }
            .c { fill: var(--missing, #445566); stroke: var(--missing); }
            @media (prefers-color-scheme: dark) { path { fill: #ffffff; } .a { fill: #ffffff; } }
            @media (prefers-color-scheme: light) { rect { fill: #abcdef; } }
            @font-face { font-family: x; src: url(http://evil.example/f.woff); }
            @keyframes k { from { fill: #000000; } }
            g > path { fill: #999999; }
            path:hover { fill: #999999; }
        </style>'.
        '<path d="M0 0h1v1z"/>'.
        '<path class="a" d="M0 0h2v2z"/>'.
        '<path id="b" class="a" d="M0 0h3v3z"/>'.
        '<path class="c" d="M0 0h4v4z"/>'.
        '<path style="fill: #0000ff" class="a" d="M0 0h5v5z"/>'.
        '<rect width="2" height="2"/>'.
        '<rect width="3" height="3" fill="#778899"/>',
    );

    $clean = SvgSanitizer::clean($svg);

    expect($clean)
        ->toContain('<path d="M0 0h1v1z" fill="#ff0000"/>')
        ->toContain('<path d="M0 0h2v2z" fill="#112233"/>')
        ->toContain('<path d="M0 0h3v3z" fill="#00ff00"/>')
        ->toContain('<path d="M0 0h4v4z" fill="#445566"/>')
        ->toContain('<path d="M0 0h5v5z" fill="#0000ff"/>')
        ->toContain('<rect width="2" height="2" fill="#abcdef"/>')
        ->toContain('<rect width="3" height="3" fill="#abcdef"/>')
        ->not->toContain('#ffffff')
        ->not->toContain('#999999')
        ->not->toContain('evil')
        ->not->toContain('<style');
});

test('a color in a variable, in light-dark() or in rgb() is read', function (string $value, string $expected) {
    expect(SvgSanitizer::clean(icon_svg("<path d=\"M0 0h4v4z\" fill=\"{$value}\"/>")))
        ->toContain("fill=\"{$expected}\"");
})->with([
    'rgb' => ['rgb(255, 0, 128)', '#ff0080'],
    'rgb in percent' => ['rgb(100%, 0%, 50%)', '#ff0080'],
    'rgb with alpha, modern syntax' => ['rgb(0 128 255 / 50%)', '#0080ff'],
    'a short hex' => ['#0f8', '#00ff88'],
    'a hex with alpha' => ['#11223344', '#112233'],
    'a name' => ['Tomato', 'tomato'],
    'light-dark' => ['light-dark(#6733ff, #7f57ff)', '#6733ff'],
    'light-dark of functions' => ['light-dark(rgb(1, 2, 3), rgb(4, 5, 6))', '#010203'],
    'currentColor' => ['currentColor', '#000000'],
    'transparent' => ['transparent', 'none'],
]);

test('a gradient is drawn as the one color it comes to', function () {
    $svg = icon_svg(
        '<defs>'.
        '<linearGradient id="two"><stop offset="0" stop-color="#ff0000"/><stop offset="1" stop-color="#0000ff"/></linearGradient>'.
        '<radialGradient id="named"><stop offset="0" stop-color="white"/><stop offset="1" stop-color="#000000"/></radialGradient>'.
        '<linearGradient id="inherits" xlink:href="#two" x1="0"/>'.
        '<linearGradient id="empty"/>'.
        '<linearGradient id="styled"><stop style="stop-color: #204060"/></linearGradient>'.
        '</defs>'.
        '<rect width="1" height="1" fill="url(#two)"/>'.
        '<rect width="2" height="2" fill="url(\'#named\')"/>'.
        '<rect width="3" height="3" fill="url(#inherits)"/>'.
        '<rect width="4" height="4" fill="url(#empty)"/>'.
        '<rect width="5" height="5" fill="url(#missing) #123456"/>'.
        '<rect width="6" height="6" fill="url(#missing)"/>'.
        '<rect width="7" height="7" fill="url(#styled)"/>',
        SVG_NS.' xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 16 16"',
    );

    $clean = SvgSanitizer::clean($svg);

    expect($clean)
        ->toContain('<rect width="1" height="1" fill="#800080"/>')
        ->toContain('<rect width="2" height="2" fill="white"/>')
        ->toContain('<rect width="3" height="3" fill="#800080"/>')
        ->toContain('<rect width="4" height="4" fill="none"/>')
        ->toContain('<rect width="5" height="5" fill="#123456"/>')
        ->toContain('<rect width="6" height="6" fill="none"/>')
        ->toContain('<rect width="7" height="7" fill="#204060"/>')
        ->not->toContain('Gradient')
        ->not->toContain('url(');
});

test('a stroke says it is opaque, because the renderer starts with one that is not', function () {
    $clean = SvgSanitizer::clean(icon_svg(
        '<path d="M0 0h4v4z" stroke="#000"/>'.
        '<path d="M0 0h5v5z" stroke="#000" stroke-opacity="0.5"/>'.
        '<path d="M0 0h6v6z" stroke="none"/>'.
        '<g stroke="red" stroke-width="2"><path d="M0 0h7v7z"/></g>',
    ));

    expect($clean)
        ->toContain('<path d="M0 0h4v4z" stroke="#000000" stroke-opacity="1"/>')
        ->toContain('<path d="M0 0h5v5z" stroke="#000000" stroke-opacity="0.5"/>')
        ->toContain('<path d="M0 0h6v6z" stroke="none"/>')
        ->toContain('<g stroke="red" stroke-opacity="1" stroke-width="2"><path d="M0 0h7v7z"/></g>');
});

test('a percentage is taken from the view box', function () {
    expect(SvgSanitizer::clean(icon_svg(
        '<rect width="100%" height="50%"/><circle cx="50%" cy="50%" r="25%"/>',
        SVG_NS.' viewBox="0 0 32 16"',
    )))
        ->toContain('<rect width="32" height="8"/>')
        ->toContain('<circle cx="16" cy="8" r="8"/>');
});

test('clip paths are written out in front, with the shapes they have left, and the rest are no clip at all', function () {
    $svg = icon_svg(
        '<g clip-path="url(#clip0)"><rect width="8" height="8" fill="#222"/></g>'.
        '<g clip-path="url(#empty)"><circle cx="8" cy="8" r="4" fill="#fc0"/></g>'.
        '<g clip-path="url(#missing)"><path d="M0 0h2v2z"/></g>'.
        '<defs>'.
        '<clipPath id="clip0" transform="translate(1 1)"><rect width="16" height="16" rx="8" fill="white"/><script>alert(1)</script></clipPath>'.
        '<clipPath id="empty"><use xlink:href="#elsewhere"/></clipPath>'.
        '</defs>',
        SVG_NS.' xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 16 16"',
    );

    $clean = SvgSanitizer::clean($svg);

    expect($clean)
        ->toContain(
            '<defs><clipPath id="clip0" transform="translate(1 1)"><rect width="16" height="16" rx="8" fill="white"/></clipPath></defs>',
        )
        ->toContain('<g clip-path="url(#clip0)"><rect width="8" height="8" fill="#222222"/></g>')
        ->toContain('<g><circle cx="8" cy="8" r="4" fill="#ffcc00"/></g>')
        ->toContain('<g><path d="M0 0h2v2z"/></g>')
        ->not->toContain('alert')
        ->not->toContain('<use');
});

test('an svg inside the svg is a group, placed by its view box', function () {
    $svg = icon_svg(
        '<rect width="40" height="40" rx="9" fill="#56BC76"/>'.
        '<svg x="5" y="5" width="30" height="30" viewBox="-5 -5 217 217" overflow="visible" fill="white"><path d="M0 0h200v200z"/></svg>'.
        '<svg width="0" height="10"><path d="M0 0h2v2z"/></svg>',
        SVG_NS.' width="40" height="40" viewBox="0 0 40 40"',
    );

    expect(SvgSanitizer::clean($svg))
        ->toContain('<rect width="40" height="40" rx="9" fill="#56bc76"/>')
        ->toContain(
            '<g fill="white" transform="translate(5.691244 5.691244) scale(0.138249)"><path d="M0 0h200v200z"/></g>',
        )
        ->not->toContain('<svg x=')
        ->not->toContain('M0 0h2v2z');
});

test('what is hidden is not drawn, and what a group says reaches what is in it', function () {
    $clean = SvgSanitizer::clean(icon_svg(
        '<g display="none"><rect width="9" height="9"/></g>'.
        '<g fill="red" opacity="0.5" transform="translate(2 3) rotate(45)"><rect width="8" height="8" class="x"/></g>'.
        '<rect width="7" height="7" style="display: none"/>',
    ));

    expect($clean)
        ->toContain(
            '<g fill="red" opacity="0.5" transform="translate(2 3) rotate(45)"><rect width="8" height="8"/></g>',
        )
        ->not->toContain('9')
        ->not->toContain('width="7"');
});

test('a hostile style sheet is read quickly, and as far as it can be', function (string $css) {
    $started = microtime(true);

    // Refused is as good as read: what counts is that it is quick.
    expect(fn (): string => SvgSanitizer::clean(icon_svg("<style>{$css}</style><rect width=\"1\" height=\"1\"/>")))
        ->not
        ->toThrow(
            Error::class,
        );
    expect(microtime(true) - $started)->toBeLessThan(1.0);
})->with([
    'braces' => [str_repeat('{', 20_000)],
    'a rule that never ends' => ['a{'.str_repeat('x', 20_000)],
    'rules nested without end' => [str_repeat('a{', 5_000)],
    'a comment that never ends' => ['/*'.str_repeat('x', 20_000)],
    'a very long selector list' => [str_repeat('a,', 5_000).'a{fill:red}'],
    'many rules' => [str_repeat('rect{fill:red}', 2_000)],
    'declarations that never end' => ['rect{'.str_repeat('fill:', 5_000).'}'],
]);
