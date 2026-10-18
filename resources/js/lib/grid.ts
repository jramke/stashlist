type Direction = 'up' | 'down' | 'left' | 'right';

const keys: Record<string, Direction> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    k: 'up',
    j: 'down',
};

/** Which way a key moves through the cards, if it does. */
export function directionOf(key: string): Direction | undefined {
    return keys[key];
}

import { play } from '@/lib/sound';

const CARD = '[data-card]';

function cards(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>(CARD));
}

/** The card that has the focus, if one has. */
export function focusedCard(): HTMLElement | null {
    return document.activeElement?.closest<HTMLElement>(CARD) ?? null;
}

/** Puts the focus on a card, with the tick of a key that moved something. */
export function moveTo(card: HTMLElement | null): void {
    if (card !== null) {
        card.focus();
        play('tick');
    }
}

/** Puts the focus on a card by its place in the feed. */
export function focusCard(which: 'first' | 'next' | 'previous'): void {
    const all = cards();
    const at = all.findIndex((card) => card === focusedCard());
    const target =
        which === 'first'
            ? all[0]
            : all[
                  Math.max(
                      0,
                      Math.min(
                          all.length - 1,
                          at + (which === 'next' ? 1 : -1),
                      ),
                  )
              ];

    moveTo(target ?? null);
}

/**
 * The card you reach by going that way, judged by where the cards are on the screen, so it works for a
 * layout in columns where the order of the page says nothing about what is above or beside what.
 */
export function neighbour(direction: Direction): HTMLElement | null {
    const from = focusedCard();

    if (from === null) {
        return cards()[0] ?? null;
    }

    const a = from.getBoundingClientRect();
    let best: HTMLElement | null = null;
    let bestScore = Infinity;

    for (const card of cards()) {
        if (card === from) {
            continue;
        }

        const b = card.getBoundingClientRect();
        const dx = b.left + b.width / 2 - (a.left + a.width / 2);
        const dy = b.top + b.height / 2 - (a.top + a.height / 2);
        const [along, across] =
            direction === 'up' || direction === 'down' ? [dy, dx] : [dx, dy];
        const sign = direction === 'up' || direction === 'left' ? -1 : 1;

        // Must lie ahead, and a card straight ahead beats one that is closer but off to the side.
        if (along * sign < 4) {
            continue;
        }

        const score = along * sign + Math.abs(across) * 2;

        if (score < bestScore) {
            best = card;
            bestScore = score;
        }
    }

    return best;
}
