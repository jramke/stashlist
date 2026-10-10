import { anchor } from './anchor';
import { buildPageText } from './page-text';
import type { StoredHighlight } from './types';

/** The colors a highlight can have. Anything else is painted in the default. */
const COLORS: Record<string, string> = {
    yellow: '#fde68a',
    green: '#bbf7d0',
    blue: '#bfdbfe',
    pink: '#fbcfe8',
    orange: '#fed7aa',
};

const DEFAULT_COLOR = 'yellow';

type HighlightRegistry = {
    set(name: string, highlight: object): unknown;
    delete(name: string): unknown;
};

type HighlightConstructor = new (...ranges: Range[]) => object;

/** What the browser offers to paint on a page without touching it (the CSS Custom Highlight API). */
export type PaintTarget = {
    registry: HighlightRegistry;
    Highlight: HighlightConstructor;
};

/** The browser's own, or null where it has none (a Firefox before 140). */
export function browserPaintTarget(): PaintTarget | null {
    const registry = (
        globalThis as { CSS?: { highlights?: HighlightRegistry } }
    ).CSS?.highlights;
    const Highlight = (globalThis as { Highlight?: HighlightConstructor })
        .Highlight;

    return registry === undefined || Highlight === undefined
        ? null
        : { registry, Highlight };
}

/**
 * Paints highlights on the page by position only: the page's own elements are not changed, so a page that
 * draws itself again does not lose them or fight the extension.
 */
export function createPainter(document: Document, target: PaintTarget) {
    let painted: string[] = [];

    return {
        /**
         * Finds every highlight in the page and paints it; whatever is gone from the page is not painted.
         *
         * @returns the ids of the highlights that were found
         */
        paint(highlights: StoredHighlight[]): number[] {
            const page = buildPageText(document.body);
            const byColor = new Map<string, Range[]>();
            const found: number[] = [];

            for (const highlight of highlights) {
                const place = anchor(page, {
                    text: highlight.text,
                    prefix: highlight.prefix,
                    suffix: highlight.suffix,
                    startOffset: highlight.startOffset,
                });
                const range =
                    place === null ? null : page.locate(place.start, place.end);

                if (range === null) {
                    continue;
                }

                const color =
                    highlight.color !== null && highlight.color in COLORS
                        ? highlight.color
                        : DEFAULT_COLOR;
                byColor.set(color, [...(byColor.get(color) ?? []), range]);
                found.push(highlight.id);
            }

            this.clear();
            ensureStyle(document);

            for (const [color, ranges] of byColor) {
                target.registry.set(
                    name(color),
                    new target.Highlight(...ranges),
                );
                painted.push(name(color));
            }

            return found;
        },

        clear(): void {
            painted.forEach((painting) => target.registry.delete(painting));
            painted = [];
        },
    };
}

function name(color: string): string {
    return `stashlist-${color}`;
}

function ensureStyle(document: Document): void {
    if (document.getElementById('stashlist-highlight-style') !== null) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'stashlist-highlight-style';
    style.textContent = Object.entries(COLORS)
        .map(
            ([color, value]) =>
                `::highlight(${name(color)}) { background-color: ${value}; color: inherit; }`,
        )
        .join('\n');

    (document.head ?? document.documentElement).append(style);
}
