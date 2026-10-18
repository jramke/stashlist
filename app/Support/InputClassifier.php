<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\StashType;

/**
 * Decides what the universal input box received: a link, an image link, a CSS color or plain text.
 *
 * Pure string work, no network. A link that turns out to serve an image is upgraded later by the
 * image resolver of the extraction step.
 */
final class InputClassifier
{
    private const MAX_URL_LENGTH = 2048;

    private const IMAGE_EXTENSION = '/\.(jpe?g|png|webp|avif|gif|heic|heif)$/i';

    /**
     * A color is written out: a hex code, or a function with its numbers (rgb, hsl, hwb, lab, lch, oklab, oklch; the
     * legacy comma form and the modern space form with a slash before the alpha). A color name is a word like any
     * other, and "salmon" in a note is dinner: lib/classify.ts has the same rule, and tests/fixtures/input-colors.json
     * is what both are tested with.
     */
    private const COLOR_PATTERN = '~^(?:#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgb|hsl|hwb|lab|lch|oklab|oklch)a?\(\s*(?:[-+]?(?:\d+\.?\d*|\.\d+)(?:%|deg|grad|rad|turn)?|none)(?:\s*[,/]?\s*(?:[-+]?(?:\d+\.?\d*|\.\d+)(?:%|deg|grad|rad|turn)?|none)){2,3}\s*\))$~i';

    /** The CSS color names: a color for a color field, a word everywhere else. @var list<string> */
    private const NAMED_COLORS = [
        'aliceblue',
        'antiquewhite',
        'aqua',
        'aquamarine',
        'azure',
        'beige',
        'bisque',
        'black',
        'blanchedalmond',
        'blue',
        'blueviolet',
        'brown',
        'burlywood',
        'cadetblue',
        'chartreuse',
        'chocolate',
        'coral',
        'cornflowerblue',
        'cornsilk',
        'crimson',
        'cyan',
        'darkblue',
        'darkcyan',
        'darkgoldenrod',
        'darkgray',
        'darkgreen',
        'darkgrey',
        'darkkhaki',
        'darkmagenta',
        'darkolivegreen',
        'darkorange',
        'darkorchid',
        'darkred',
        'darksalmon',
        'darkseagreen',
        'darkslateblue',
        'darkslategray',
        'darkslategrey',
        'darkturquoise',
        'darkviolet',
        'deeppink',
        'deepskyblue',
        'dimgray',
        'dimgrey',
        'dodgerblue',
        'firebrick',
        'floralwhite',
        'forestgreen',
        'fuchsia',
        'gainsboro',
        'ghostwhite',
        'gold',
        'goldenrod',
        'gray',
        'green',
        'greenyellow',
        'grey',
        'honeydew',
        'hotpink',
        'indianred',
        'indigo',
        'ivory',
        'khaki',
        'lavender',
        'lavenderblush',
        'lawngreen',
        'lemonchiffon',
        'lightblue',
        'lightcoral',
        'lightcyan',
        'lightgoldenrodyellow',
        'lightgray',
        'lightgreen',
        'lightgrey',
        'lightpink',
        'lightsalmon',
        'lightseagreen',
        'lightskyblue',
        'lightslategray',
        'lightslategrey',
        'lightsteelblue',
        'lightyellow',
        'lime',
        'limegreen',
        'linen',
        'magenta',
        'maroon',
        'mediumaquamarine',
        'mediumblue',
        'mediumorchid',
        'mediumpurple',
        'mediumseagreen',
        'mediumslateblue',
        'mediumspringgreen',
        'mediumturquoise',
        'mediumvioletred',
        'midnightblue',
        'mintcream',
        'mistyrose',
        'moccasin',
        'navajowhite',
        'navy',
        'oldlace',
        'olive',
        'olivedrab',
        'orange',
        'orangered',
        'orchid',
        'palegoldenrod',
        'palegreen',
        'paleturquoise',
        'palevioletred',
        'papayawhip',
        'peachpuff',
        'peru',
        'pink',
        'plum',
        'powderblue',
        'purple',
        'rebeccapurple',
        'red',
        'rosybrown',
        'royalblue',
        'saddlebrown',
        'salmon',
        'sandybrown',
        'seagreen',
        'seashell',
        'sienna',
        'silver',
        'skyblue',
        'slateblue',
        'slategray',
        'slategrey',
        'snow',
        'springgreen',
        'steelblue',
        'tan',
        'teal',
        'thistle',
        'tomato',
        'turquoise',
        'violet',
        'wheat',
        'white',
        'whitesmoke',
        'yellow',
        'yellowgreen',
    ];

    public function classify(string $input): ClassifiedInput
    {
        $input = trim($input);

        $url = $this->webUrl($input);

        if ($url !== null) {
            $path = parse_url($url, PHP_URL_PATH);
            $isImage = is_string($path) && preg_match(self::IMAGE_EXTENSION, $path) === 1;

            return new ClassifiedInput($isImage ? StashType::Image : StashType::Link, $url);
        }

        if ($this->isCssColor($input)) {
            return new ClassifiedInput(StashType::Color, strtolower($input));
        }

        return new ClassifiedInput(StashType::Note, $input);
    }

    /**
     * The input as an absolute web URL, or null when it is anything else (including text that merely
     * contains a URL).
     */
    private function webUrl(string $input): ?string
    {
        if ($input === '' || strlen($input) > self::MAX_URL_LENGTH || preg_match('/\s/', $input) === 1) {
            return null;
        }

        if (UrlNormalizer::normalize($input) === null) {
            return null;
        }

        return str_starts_with($input, '//') ? 'https:'.$input : $input;
    }

    private function isCssColor(string $input): bool
    {
        return preg_match(self::COLOR_PATTERN, $input) === 1;
    }

    /**
     * Whether a value is a color for a field that says it is one, such as the value of a color stash: written out,
     * or one of the CSS color names. In the box a name is only a word.
     */
    public function isColorValue(string $input): bool
    {
        $input = trim($input);

        return $this->isCssColor($input) || in_array(strtolower($input), self::NAMED_COLORS, strict: true);
    }
}
