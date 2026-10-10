/**
 * The text of a page as one string, and the way back from a place in that string to a place in the page.
 *
 * It is the text a person reads: white space collapsed to single spaces, a space where one block ends and the
 * next begins, nothing from scripts, styles, form controls or hidden elements. The same page gives the same
 * string on every visit, which is what lets a highlight be found again: the passage is searched for in this
 * string and then turned into a Range in the live document.
 */

const BLOCKS = new Set([
    'ADDRESS',
    'ARTICLE',
    'ASIDE',
    'BLOCKQUOTE',
    'BODY',
    'BR',
    'CAPTION',
    'DD',
    'DETAILS',
    'DIALOG',
    'DIV',
    'DL',
    'DT',
    'FIELDSET',
    'FIGCAPTION',
    'FIGURE',
    'FOOTER',
    'FORM',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'HEADER',
    'HGROUP',
    'HR',
    'LI',
    'MAIN',
    'MENU',
    'NAV',
    'OL',
    'P',
    'PRE',
    'SECTION',
    'SUMMARY',
    'TABLE',
    'TBODY',
    'TD',
    'TFOOT',
    'TH',
    'THEAD',
    'TR',
    'UL',
]);

const SKIPPED = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'TEMPLATE',
    'TEXTAREA',
    'SELECT',
    'OPTION',
    'SVG',
    'IFRAME',
    'CANVAS',
    'OBJECT',
    'HEAD',
]);

/** Room per text node for the character index in the key that orders places in the text. */
const PER_NODE = 2 ** 24;

export type PageText = {
    /** The text of the page, white space collapsed. */
    readonly text: string;
    /** The part of the live page from start (included) to end (excluded) of `text`; null when it is only separators. */
    locate(start: number, end: number): Range | null;
    /** Where a place in the page falls in `text`: the first character at or after it. */
    offsetOf(container: Node, offset: number): number;
};

export function buildPageText(root: Node): PageText {
    const nodes: Text[] = [];
    const nodeOf: number[] = [];
    const charOf: number[] = [];
    const keys: number[] = [];
    const chars: string[] = [];
    let lastWasSpace = true;

    function push(char: string, node: number, index: number): void {
        const key =
            node >= 0 ? node * PER_NODE + index : (keys[keys.length - 1] ?? 0);

        chars.push(char);
        nodeOf.push(node);
        charOf.push(index);
        keys.push(key);
    }

    function separate(): void {
        if (!lastWasSpace && chars.length > 0) {
            push(' ', -1, 0);
            lastWasSpace = true;
        }
    }

    function addText(text: Text): void {
        const id = nodes.length;
        nodes.push(text);

        const data = text.data;

        for (let index = 0; index < data.length; index++) {
            const char = data.charAt(index);

            if (/\s/.test(char)) {
                if (!lastWasSpace) {
                    push(' ', id, index);
                    lastWasSpace = true;
                }
            } else {
                push(char, id, index);
                lastWasSpace = false;
            }
        }
    }

    function walk(node: Node): void {
        if (node.nodeType === 3) {
            addText(node as Text);

            return;
        }

        if (node.nodeType !== 1) {
            return;
        }

        const element = node as Element;
        const tag = element.tagName.toUpperCase();

        if (SKIPPED.has(tag) || isHidden(element)) {
            return;
        }

        const block = BLOCKS.has(tag);

        if (block) {
            separate();
        }

        element.childNodes.forEach(walk);

        if (block) {
            separate();
        }
    }

    walk(root);

    // The text neither starts nor ends with a space.
    while (chars[chars.length - 1] === ' ') {
        chars.pop();
        nodeOf.pop();
        charOf.pop();
        keys.pop();
    }

    const text = chars.join('');

    return {
        text,

        locate(start, end) {
            let first = Math.max(0, start);
            let last = Math.min(text.length, end) - 1;

            while (first <= last && nodeOf[first] === -1) first++;
            while (last >= first && nodeOf[last] === -1) last--;

            const startNode = nodes[nodeOf[first] ?? -1];
            const endNode = nodes[nodeOf[last] ?? -1];

            if (
                first > last ||
                startNode === undefined ||
                endNode === undefined
            ) {
                return null;
            }

            const range = (
                root.ownerDocument ?? (root as Document)
            ).createRange();
            range.setStart(startNode, charOf[first] ?? 0);
            range.setEnd(endNode, (charOf[last] ?? 0) + 1);

            return range;
        },

        offsetOf(container, offset) {
            const place = resolve(container, offset, nodes);

            if (place === null) {
                return text.length;
            }

            const target = place.id * PER_NODE + place.offset;
            let low = 0;
            let high = keys.length;

            // The first character whose key is at or after the place (keys never go down).
            while (low < high) {
                const middle = (low + high) >>> 1;

                if ((keys[middle] ?? 0) < target) low = middle + 1;
                else high = middle;
            }

            return low;
        },
    };
}

/** A text node and a character in it for a place given as (container, offset), which may be an element. */
function resolve(
    container: Node,
    offset: number,
    nodes: Text[],
): { id: number; offset: number } | null {
    if (container.nodeType === 3) {
        const id = nodes.indexOf(container as Text);

        return id < 0 ? null : { id, offset };
    }

    // A place between children: the text node after it, or the end of the last one before it.
    const child = container.childNodes[offset];

    if (child !== undefined) {
        const next = firstTextIn(child) ?? nextTextAfter(child);
        const id = next === null ? -1 : nodes.indexOf(next);

        return id < 0 ? null : { id, offset: 0 };
    }

    const before = lastTextIn(container);
    const id = before === null ? -1 : nodes.indexOf(before);

    return id < 0 || before === null
        ? null
        : { id, offset: before.data.length };
}

function firstTextIn(node: Node): Text | null {
    if (node.nodeType === 3) return node as Text;

    for (const child of Array.from(node.childNodes)) {
        const found = firstTextIn(child);

        if (found !== null) return found;
    }

    return null;
}

function lastTextIn(node: Node): Text | null {
    if (node.nodeType === 3) return node as Text;

    for (const child of Array.from(node.childNodes).reverse()) {
        const found = lastTextIn(child);

        if (found !== null) return found;
    }

    return null;
}

function nextTextAfter(node: Node): Text | null {
    for (
        let sibling = node.nextSibling;
        sibling !== null;
        sibling = sibling.nextSibling
    ) {
        const found = firstTextIn(sibling);

        if (found !== null) return found;
    }

    return node.parentNode === null ? null : nextTextAfter(node.parentNode);
}

function isHidden(element: Element): boolean {
    if (
        element.hasAttribute('hidden') ||
        element.getAttribute('aria-hidden') === 'true'
    ) {
        return true;
    }

    // Not in every environment; where it is, it knows about display and visibility set by style sheets.
    const check = (
        element as Element & {
            checkVisibility?: (options: {
                checkVisibilityCSS: boolean;
            }) => boolean;
        }
    ).checkVisibility;

    return typeof check === 'function'
        ? !check.call(element, { checkVisibilityCSS: true })
        : false;
}
