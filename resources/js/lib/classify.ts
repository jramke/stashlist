export type Classified = 'empty' | 'link' | 'color' | 'text';

const LINK = /^(?:https?:)?\/\/\S+$/i;
const COLOR =
    /^(?:#(?:[0-9a-f]{3}|[0-9a-f]{6})|(?:rgb|hsl)a?\(\s*[\d.,%\s/]+\))$/i;

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
