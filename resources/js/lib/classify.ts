export type Classified = 'empty' | 'link' | 'color' | 'text';

const LINK = /^(?:https?:)?\/\/\S+$/i;
// The same rule as `InputClassifier::COLOR_PATTERN`, tested with the same samples (tests/fixtures/input-colors.json):
// a color is written out, a hex code or a function with its numbers; a color name is a word like any other.
const PART = String.raw`(?:[-+]?(?:\d+\.?\d*|\.\d+)(?:%|deg|grad|rad|turn)?|none)`;
const COLOR = new RegExp(
    String.raw`^(?:#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgb|hsl|hwb|lab|lch|oklab|oklch)a?\(\s*${PART}(?:\s*[,/]?\s*${PART}){2,3}\s*\))$`,
    'i',
);

/**
 * What the box probably holds, for the hint next to it. The server decides for real (`InputClassifier`); this
 * only has to agree about the cases where Enter saves: a link or a color written as a code.
 */
export function classify(text: string): Classified {
    const value = text.trim();

    if (value === '') {
        return 'empty';
    }

    if (LINK.test(value)) {
        return 'link';
    }

    return COLOR.test(value) ? 'color' : 'text';
}
