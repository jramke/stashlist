import { quoteOf } from './anchor';
import { buildPageText } from './page-text';

/** The longest passage the server takes. */
export const MAX_PASSAGE = 2000;

export type SelectedPassage = {
    text: string;
    prefix: string;
    suffix: string;
    startOffset: number;
};

export type SelectionOutcome =
    | { ok: true; passage: SelectedPassage }
    | { ok: false; reason: 'nothing' | 'too-long' };

/**
 * The passage the person has selected, with the text around it. The selection is turned into a span of the page
 * text (white space collapsed, hidden text left out), which is also what is searched when the page is visited
 * again.
 */
export function describeSelection(
    document: Document,
    selection: Selection | null,
): SelectionOutcome {
    if (
        selection === null ||
        selection.rangeCount === 0 ||
        selection.isCollapsed
    ) {
        return { ok: false, reason: 'nothing' };
    }

    return describeRange(document, selection.getRangeAt(0));
}

export function describeRange(
    document: Document,
    range: Range,
): SelectionOutcome {
    const page = buildPageText(document.body);
    const quote = quoteOf(
        page,
        page.offsetOf(range.startContainer, range.startOffset),
        page.offsetOf(range.endContainer, range.endOffset),
    );

    if (quote === null) {
        return { ok: false, reason: 'nothing' };
    }

    if (quote.text.length > MAX_PASSAGE) {
        return { ok: false, reason: 'too-long' };
    }

    return {
        ok: true,
        passage: {
            text: quote.text,
            prefix: quote.prefix,
            suffix: quote.suffix,
            startOffset: quote.startOffset ?? 0,
        },
    };
}
