import { createMachine } from '@zag-js/core';
import { dom } from './dom';
import {
    faceOf,
    indicatorOf,
    initialMedia,
    phaseOf,
    statusesOf,
    titleOf,
} from './face';
import type { MediaStatus, StashCardSchema } from './types';

/** How long the "done" mark stays after a card has been filled in. */
const ARRIVED_FOR = 1600;

/**
 * The life of a card. Its phase follows the stash (the page asks again while a card is being filled in, and
 * the new props arrive as `PHASE.SYNC`); the machine remembers where it came from, which props cannot: a card
 * that turns ready from fetching or tagging has just *arrived*, and says so for a moment. The picture has its
 * own small story (loading, loaded, broken) that decides which face shows: a broken picture falls back to a
 * tile instead of an empty box.
 *
 *   fetching ──► tagging ──► ready        any phase ──► failed (and back, when a retry works)
 *      └───────────────────►
 */
export const machine = createMachine<StashCardSchema>({
    props({ props }) {
        return { fresh: false, highlighted: false, peek: false, ...props };
    },

    context({ prop, bindable }) {
        return {
            media: bindable<MediaStatus>(() => ({
                defaultValue: initialMedia(prop('stash')),
            })),
            arrived: bindable<boolean>(() => ({ defaultValue: false })),
        };
    },

    computed: {
        face: ({ prop, context }) =>
            faceOf(prop('stash'), context.get('media')),
        title: ({ prop }) => titleOf(prop('stash')),
        indicator: ({ prop }) => indicatorOf(prop('stash')),
        statuses: ({ prop, context }) =>
            statusesOf(
                prop('stash'),
                phaseOf(prop('stash')),
                context.get('arrived'),
            ),
        busy: ({ prop }) => {
            const phase = phaseOf(prop('stash'));

            return phase === 'fetching' || phase === 'tagging';
        },
    },

    initialState({ prop }) {
        return phaseOf(prop('stash'));
    },

    watch({ track, prop, send }) {
        track([() => phaseOf(prop('stash'))], () =>
            send({ type: 'PHASE.SYNC' }),
        );
        track([() => prop('stash').thumbnail?.url ?? null], () =>
            send({ type: 'MEDIA.SOURCE' }),
        );
    },

    effects: ['checkPicture'],

    on: {
        'PHASE.SYNC': [
            { guard: 'isFailed', target: 'failed' },
            { guard: 'isFetching', target: 'fetching' },
            { guard: 'isTagging', target: 'tagging' },
            { guard: 'wasBusy', target: 'ready', actions: ['markArrived'] },
            { target: 'ready' },
        ],
        'MEDIA.SOURCE': { actions: ['resetMedia'] },
        'MEDIA.LOAD': { actions: ['mediaLoaded'] },
        'MEDIA.ERROR': { actions: ['mediaBroken'] },
        'ARRIVED.END': { actions: ['clearArrived'] },
    },

    states: {
        fetching: { tags: ['busy'] },
        tagging: { tags: ['busy'] },
        ready: { tags: ['settled'], effects: ['endArrival'] },
        failed: { tags: ['settled'] },
    },

    implementations: {
        guards: {
            isFailed: ({ prop }) => phaseOf(prop('stash')) === 'failed',
            isFetching: ({ prop }) => phaseOf(prop('stash')) === 'fetching',
            isTagging: ({ prop }) => phaseOf(prop('stash')) === 'tagging',
            wasBusy: ({ state }) => state.matches('fetching', 'tagging'),
        },

        actions: {
            markArrived({ context, prop }) {
                context.set('arrived', true);
                prop('onArrive')?.({ phase: 'ready' });
            },
            clearArrived({ context }) {
                context.set('arrived', false);
            },
            resetMedia({ context, prop }) {
                context.set('media', initialMedia(prop('stash')));
            },
            mediaLoaded({ context }) {
                if (context.get('media') !== 'none') {
                    context.set('media', 'loaded');
                }
            },
            mediaBroken({ context }) {
                context.set('media', 'broken');
            },
        },

        effects: {
            // A picture the browser finished before this card came alive (a server-rendered page) has fired its
            // load event already, and nobody was listening. Ask the picture itself.
            checkPicture({ scope, send }) {
                const image = dom.getImageEl(scope);

                if (image?.complete) {
                    send({
                        type:
                            image.naturalWidth > 0
                                ? 'MEDIA.LOAD'
                                : 'MEDIA.ERROR',
                    });
                }
            },

            endArrival({ context, send }) {
                if (!context.get('arrived')) {
                    return;
                }

                const timer = setTimeout(
                    () => send({ type: 'ARRIVED.END' }),
                    ARRIVED_FOR,
                );

                return () => clearTimeout(timer);
            },
        },
    },
});
