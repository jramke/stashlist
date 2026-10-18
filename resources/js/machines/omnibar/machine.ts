import { classify } from '@/lib/classify';
import { feedUrl, type SearchMode } from '@/lib/feed-url';
import {
    createGuards,
    createMachine,
    type BindableContext,
    type ComputedFn,
    type MachineState,
    type Params,
} from '@zag-js/core';
import { dom } from './dom';
import {
    HYBRID_DELAY,
    HYBRID_MIN_LENGTH,
    KEYWORD_DELAY,
    chipsOf,
    colorWordIn,
    joinWord,
    menuOf,
    queryOf,
    suggestionsOf,
} from './grammar';
import type {
    Chip,
    Filters,
    Guess,
    OmnibarSchema,
    OmnibarState,
    Row,
} from './types';

type P = Params<OmnibarSchema>;

const { and } = createGuards<OmnibarSchema>();

/**
 * What the list shows: nothing while it is closed, the suggestions for what is typed, or the menu of an empty
 * box. `suggesting` tells the first of those from the last.
 */
export function listOf(view: {
    state: { matches: (...values: OmnibarState[]) => boolean };
    computed: ComputedFn<OmnibarSchema>;
    context: BindableContext<OmnibarSchema>;
}): { rows: Row[]; suggesting: boolean } {
    if (!view.state.matches('open')) {
        return { rows: [], suggesting: false };
    }

    const suggestions = view.computed('suggestions');

    if (suggestions.length > 0) {
        return { rows: suggestions, suggesting: true };
    }

    return {
        rows:
            view.context.get('text') === '' && view.state.matches('open.menu')
                ? view.computed('menu')
                : [],
        suggesting: false,
    };
}

function rowsOf(view: Parameters<typeof listOf>[0]): Row[] {
    return listOf(view).rows;
}

/** What is in the field right now. The field is the truth while the person types; the context follows it. */
function textOf({ scope, context }: P): string {
    return dom.getInputEl(scope)?.value ?? context.get('text');
}

/** Puts new text in the field (the cursor goes to its end) and in the context. */
function replaceText({ scope, context }: P, text: string): void {
    const field = dom.getInputEl(scope);

    if (field !== null && field.value !== text) {
        field.value = text;
    }

    context.set('text', text);
}

function clearTimers({ refs }: P): void {
    refs.get('timers').forEach((id) => clearTimeout(id));
    refs.set('timers', []);
}

/** Asks for the feed with some filters changed. The query is whatever the box holds now. */
function visit(
    { computed, context, prop, refs, send }: P,
    change: Partial<Filters>,
    mode?: SearchMode,
    replace = false,
): void {
    const shown = computed('shown');
    const next = { ...shown, ...change };

    refs.set('requested', next.q ?? '');
    context.set('guess', { base: prop('filters'), next });

    prop('onVisit')({
        url: feedUrl(shown, change, mode),
        replace,
        failed: () => send({ type: 'VISIT.FAILED' }),
    });
}

/** Searches as you type: the keyword results after a short pause, the smarter ones after a longer one. */
function scheduleSearch({ refs, send }: P, value: string): void {
    const query = queryOf(value);
    const timers: number[] = [];
    const fire = (mode: SearchMode, delay: number) =>
        timers.push(
            window.setTimeout(() => send({ type: 'SEARCH.FIRE', mode }), delay),
        );

    if ((query ?? '') !== refs.get('requested')) {
        fire('keyword', KEYWORD_DELAY);

        if (query !== null && query.length >= HYBRID_MIN_LENGTH) {
            fire('hybrid', HYBRID_DELAY);
        }
    }

    refs.set('timers', timers);
}

/** Turns something typed into a filter: the text that is left keeps searching. */
function takeFilter(params: P, rest: string, change: Partial<Filters>): void {
    params.prop('onTake')?.();
    clearTimers(params);
    replaceText(params, rest);
    params.context.set('highlight', -1);
    visit(params, { ...change, q: queryOf(rest) }, 'hybrid');
}

function takeRow(params: P, row: Row | undefined): void {
    if (row?.action.type === 'filter') {
        takeFilter(params, row.action.rest, row.action.change);
    } else if (row?.action.type === 'upload') {
        dom.getPickerEl(params.scope)?.click();
    }
}

function removeChip(params: P, chip: Chip | undefined): void {
    if (chip === undefined) {
        return;
    }

    const text = textOf(params);
    const rest = chip.word === undefined ? text : joinWord(chip.word, text);

    clearTimers(params);
    replaceText(params, rest);
    visit(params, { ...chip.without, q: queryOf(rest) }, 'hybrid');
    dom.getInputEl(params.scope)?.focus();
}

/** The row the keyboard is on, if the list shows one. */
function pickedRow(params: P): Row | undefined {
    return rowsOf(params)[params.context.get('highlight')];
}

/** Sends something to the server. One at a time: the box ignores the next until this one is over. */
function startStash(
    params: P,
    data: { input: string } | { image: File },
): void {
    const { computed, context, prop, refs, send } = params;
    const shown = computed('shown');

    clearTimers(params);
    context.set('error', null);
    refs.set('sentText', 'input' in data);

    prop('onStash')({
        payload: {
            ...data,
            // What is in the box when it is stashed: the collection and the tags of the chips come along.
            tags: shown.tags.flatMap(
                (id) => prop('tags').find((tag) => tag.id === id)?.name ?? [],
            ),
            collection_ids:
                shown.collection !== null && shown.collection !== 'none'
                    ? [Number(shown.collection)]
                    : [],
        },
        succeeded: () => send({ type: 'STASH.SUCCESS' }),
        failed: (message) => send({ type: 'STASH.FAILURE', message }),
        settled: () => send({ type: 'STASH.SETTLED' }),
    });
}

function imagesIn(files: File[]): File[] {
    return files.filter((file) => file.type.startsWith('image/'));
}

/** Stashes the first image of some files; the others have to wait for another turn. */
function startImageStash(params: P, files: File[]): void {
    const [first, ...others] = imagesIn(files);

    if (first === undefined) {
        return;
    }

    startStash(params, { image: first });

    if (others.length > 0) {
        params.context.set('error', 'One image at a time for now.');
    }
}

/**
 * What the box does with keys, text, the list and files. `idle` and `open` follow the same rules, so they are
 * written once; `stashing` takes none of them, which is how it refuses a second request.
 */
const interactions = {
    // Typing: a note is old news, a mistake is forgiven, and the list offers what the word could become.
    'INPUT.CHANGE': [
        {
            guard: 'endsInColorWord',
            target: 'idle',
            actions: ['noteDone', 'clearError', 'takeColorWord'],
        },
        {
            target: 'open.suggest',
            actions: ['noteDone', 'clearError', 'typed'],
        },
    ],
    'SEARCH.FIRE': { actions: ['runSearch'] },

    'INPUT.ENTER': [
        {
            guard: and('isModifier', 'hasText'),
            target: 'stashing',
            actions: ['stashText'],
        },
        { guard: 'isModifier' },
        { guard: 'pickedIsFilter', target: 'idle', actions: ['takePicked'] },
        { guard: 'pickedIsUpload', actions: ['takePicked'] },
        {
            guard: 'entersLinkOrColor',
            target: 'stashing',
            actions: ['stashText'],
        },
    ],
    'INPUT.ESCAPE': [
        { guard: 'isVisible', target: 'idle' },
        { guard: 'hasText', actions: ['clearSearch'] },
        { actions: ['blurField'] },
    ],
    'INPUT.LEAVE': { actions: ['leave'] },
    'LIST.NEXT': { actions: ['highlightNext'] },
    'LIST.PREVIOUS': { actions: ['highlightPrevious'] },
    'LIST.ACCEPT': { target: 'idle', actions: ['takeSuggestion'] },
    'ROW.CLICK': [
        {
            guard: 'rowIsFilter',
            target: 'idle',
            actions: ['takeClicked', 'focusInput'],
        },
        { guard: 'rowIsUpload', actions: ['takeClicked', 'focusInput'] },
    ],
    'CHIP.POP': { actions: ['popChip'] },
    'CHIP.REMOVE': { actions: ['dropChip'] },
    'POINTER.DOWN': { target: 'open.menu' },

    'STASH.TEXT': {
        guard: 'hasText',
        target: 'stashing',
        actions: ['stashText'],
    },
    'FILES.STASH': [
        { guard: 'eventHasImage', target: 'stashing', actions: ['stashImage'] },
        { actions: ['rejectFiles'] },
    ],
    'DRAG.DROP': [
        {
            guard: 'eventHasImage',
            target: 'stashing',
            actions: ['endDrag', 'stashImage'],
        },
        { guard: 'eventHasFiles', actions: ['endDrag', 'rejectFiles'] },
        {
            guard: 'eventHasLink',
            target: 'stashing',
            actions: ['endDrag', 'stashDroppedLink'],
        },
        { actions: ['endDrag'] },
    ],
} satisfies NonNullable<MachineState<OmnibarSchema>['on']>;

/**
 * The one box of the feed. Its words are states and events: the list is closed, open as suggestions for what
 * is typed or open as the menu of an empty box, and a request to save something can be on its way. Orthogonal
 * to that, in the context: what is typed, the row the keyboard is on, the filters guessed before the server
 * answers, an error, and whether something is being dragged over the page.
 *
 *   idle ──type──► open.suggest ──Tab / Enter on a row──► idle        (the word became a chip)
 *     │  ◄── Escape, blur ──┘  ▲
 *     └──click, empty──► open.menu     idle / open ──save──► stashing ──answer──► idle
 */
export const machine = createMachine<OmnibarSchema>({
    props({ props }) {
        return { initial: null, note: null, ...props };
    },

    context({ prop, bindable }) {
        return {
            text: bindable<string>(() => ({
                defaultValue: prop('initial') ?? prop('filters').q ?? '',
            })),
            highlight: bindable<number>(() => ({ defaultValue: -1 })),
            dragging: bindable<boolean>(() => ({ defaultValue: false })),
            error: bindable<string | null>(() => ({ defaultValue: null })),
            guess: bindable<Guess | null>(() => ({
                defaultValue: null,
            })),
        };
    },

    refs({ prop }) {
        return {
            requested: prop('filters').q ?? '',
            timers: [],
            sentText: false,
        };
    },

    computed: {
        shown: ({ context, prop }) => {
            const guess = context.get('guess');

            return guess !== null && guess.base === prop('filters')
                ? guess.next
                : prop('filters');
        },
        kind: ({ context }) => classify(context.get('text')),
        chips: ({ computed, prop }) =>
            chipsOf(computed('shown'), prop('tags'), prop('collections')),
        suggestions: ({ computed, context, prop }) =>
            suggestionsOf(
                context.get('text'),
                computed('kind'),
                computed('shown'),
                prop('tags'),
                prop('collections'),
            ),
        menu: ({ computed, prop }) =>
            menuOf(computed('shown'), prop('collections')),
    },

    initialState() {
        return 'idle';
    },

    watch({ track, prop, send }) {
        // The back button changed the query behind our back.
        track([() => prop('filters').q], () => send({ type: 'FILTERS.SYNC' }));
        track([() => prop('initial')], () => send({ type: 'SHARE.SYNC' }));
    },

    effects: ['watchDrag', 'focusOnStart', 'stopTimers'],

    on: {
        'FILTERS.SYNC': { actions: ['adoptQuery'] },
        'SHARE.SYNC': { actions: ['adoptShare'] },
        'VISIT.FAILED': { actions: ['forgetGuess'] },
        'ROW.HOVER': { actions: ['highlightRow'] },
        'DRAG.OVER': { actions: ['dragOver'] },
        'DRAG.LEAVE': { actions: ['dragLeave'] },
    },

    states: {
        idle: { on: interactions },

        open: {
            tags: ['open'],
            initial: 'suggest',
            exit: ['resetHighlight'],
            on: { ...interactions, 'FOCUS.OUT': { target: 'idle' } },
            states: { suggest: {}, menu: {} },
        },

        // One request at a time: what the person types goes into the box, and nothing else starts until the
        // server has answered.
        stashing: {
            tags: ['busy'],
            on: {
                'INPUT.CHANGE': {
                    actions: ['noteDone', 'clearError', 'typedWhileStashing'],
                },
                'STASH.SUCCESS': { target: 'idle', actions: ['finishStash'] },
                'STASH.FAILURE': { target: 'idle', actions: ['failStash'] },
                'STASH.SETTLED': { target: 'idle' },
                'DRAG.DROP': { actions: ['endDrag'] },
            },
        },
    },

    implementations: {
        guards: {
            endsInColorWord: ({ event, computed }) =>
                event.type === 'INPUT.CHANGE' &&
                computed('shown').color === null &&
                colorWordIn(event.value) !== null,
            hasText: (params) => textOf(params).trim() !== '',
            isModifier: ({ event }) =>
                event.type === 'INPUT.ENTER' && event.modifier,
            pickedIsFilter: (params) =>
                pickedRow(params)?.action.type === 'filter',
            pickedIsUpload: (params) =>
                pickedRow(params)?.action.type === 'upload',
            entersLinkOrColor: (params) =>
                ['link', 'color'].includes(classify(textOf(params))),
            rowIsFilter: (params) =>
                params.event.type === 'ROW.CLICK' &&
                rowsOf(params)[params.event.index]?.action.type === 'filter',
            rowIsUpload: (params) =>
                params.event.type === 'ROW.CLICK' &&
                rowsOf(params)[params.event.index]?.action.type === 'upload',
            isVisible: (params) => rowsOf(params).length > 0,
            eventHasImage: ({ event }) =>
                (event.type === 'FILES.STASH' || event.type === 'DRAG.DROP') &&
                imagesIn(event.files).length > 0,
            eventHasFiles: ({ event }) =>
                event.type === 'DRAG.DROP' && event.files.length > 0,
            eventHasLink: ({ event }) =>
                event.type === 'DRAG.DROP' && event.link !== '',
        },

        actions: {
            noteDone({ prop }) {
                // A note with an Undo button stays: it is the last chance to take a delete back.
                if (prop('note')?.undo_url === null) {
                    prop('onNoteDone')?.();
                }
            },
            clearError({ context }) {
                context.set('error', null);
            },
            typed(params) {
                const { context, event } = params;

                if (event.type !== 'INPUT.CHANGE') {
                    return;
                }

                clearTimers(params);
                context.set('text', event.value);
                context.set('highlight', -1);
                scheduleSearch(params, event.value);
            },
            typedWhileStashing({ context, event }) {
                if (event.type === 'INPUT.CHANGE') {
                    context.set('text', event.value);
                }
            },
            takeColorWord(params) {
                const found =
                    params.event.type === 'INPUT.CHANGE'
                        ? colorWordIn(params.event.value)
                        : null;

                if (found !== null) {
                    takeFilter(params, found.rest, { color: found.word });
                }
            },
            takePicked(params) {
                takeRow(params, pickedRow(params));
            },
            takeSuggestion(params) {
                takeRow(
                    params,
                    pickedRow(params) ?? params.computed('suggestions')[0],
                );
            },
            takeClicked(params) {
                if (params.event.type === 'ROW.CLICK') {
                    takeRow(params, rowsOf(params)[params.event.index]);
                }
            },
            openPicker({ scope }) {
                dom.getPickerEl(scope)?.click();
            },
            focusInput({ scope }) {
                dom.getInputEl(scope)?.focus();
            },
            leave({ prop }) {
                prop('onLeave')?.();
            },
            highlightNext(params) {
                const last = rowsOf(params).length - 1;

                params.context.set('highlight', (index) =>
                    Math.min(index + 1, last),
                );
            },
            highlightPrevious({ context }) {
                context.set('highlight', (index) => index - 1);
            },
            highlightRow({ context, event }) {
                if (event.type === 'ROW.HOVER') {
                    context.set('highlight', event.index);
                }
            },
            resetHighlight({ context }) {
                context.set('highlight', -1);
            },
            popChip(params) {
                removeChip(params, params.computed('chips').at(-1));
            },
            dropChip(params) {
                if (params.event.type === 'CHIP.REMOVE') {
                    const { key } = params.event;

                    removeChip(
                        params,
                        params
                            .computed('chips')
                            .find((chip) => chip.key === key),
                    );
                }
            },
            clearSearch(params) {
                clearTimers(params);
                replaceText(params, '');
                visit(params, { q: null }, undefined, true);
            },
            blurField({ scope }) {
                dom.getInputEl(scope)?.blur();
            },
            runSearch(params) {
                if (params.event.type !== 'SEARCH.FIRE') {
                    return;
                }

                const query = queryOf(textOf(params));

                visit(
                    params,
                    { q: query },
                    query === null ? undefined : params.event.mode,
                    true,
                );
            },
            adoptQuery(params) {
                const current = params.prop('filters').q ?? '';

                if (current !== params.refs.get('requested')) {
                    params.refs.set('requested', current);
                    replaceText(params, current);
                }
            },
            adoptShare(params) {
                const shared = params.prop('initial');

                if (shared !== null) {
                    replaceText(params, shared);
                    dom.getInputEl(params.scope)?.focus();
                }
            },
            forgetGuess({ context }) {
                context.set('guess', null);
            },
            dragOver({ context }) {
                context.set('dragging', true);
            },
            dragLeave({ context }) {
                context.set('dragging', false);
            },
            endDrag({ context }) {
                context.set('dragging', false);
            },
            rejectFiles({ context }) {
                context.set('error', 'This is not an image we can use.');
            },
            stashText(params) {
                startStash(params, { input: textOf(params) });
            },
            stashImage(params) {
                if (
                    params.event.type === 'FILES.STASH' ||
                    params.event.type === 'DRAG.DROP'
                ) {
                    startImageStash(params, params.event.files);
                }
            },
            stashDroppedLink(params) {
                if (params.event.type === 'DRAG.DROP') {
                    startStash(params, { input: params.event.link });
                }
            },
            finishStash(params) {
                if (params.refs.get('sentText')) {
                    replaceText(params, '');

                    // The note was searched for while it was typed; the address still says so.
                    if (params.refs.get('requested') !== '') {
                        visit(params, { q: null }, undefined, true);
                    }
                }

                params.prop('onStashed')?.();
            },
            failStash({ context, event }) {
                if (event.type === 'STASH.FAILURE') {
                    context.set('error', event.message);
                }
            },
        },

        effects: {
            // Anything dropped anywhere on the page is for the box.
            watchDrag({ scope, send }) {
                const win = scope.getWin();
                const carries = (event: DragEvent) =>
                    event.dataTransfer?.types.some((type) =>
                        ['Files', 'text/uri-list'].includes(type),
                    ) ?? false;

                const over = (event: DragEvent) => {
                    if (carries(event)) {
                        event.preventDefault();
                        send({ type: 'DRAG.OVER' });
                    }
                };
                const leave = (event: DragEvent) => {
                    if (event.relatedTarget === null) {
                        send({ type: 'DRAG.LEAVE' });
                    }
                };
                const drop = (event: DragEvent) => {
                    if (!carries(event) || event.dataTransfer === null) {
                        return;
                    }

                    event.preventDefault();

                    send({
                        type: 'DRAG.DROP',
                        files: Array.from(event.dataTransfer.files),
                        link:
                            event.dataTransfer
                                .getData('text/uri-list')
                                .split('\n')[0]
                                ?.trim() ?? '',
                    });
                };

                win.addEventListener('dragover', over);
                win.addEventListener('dragleave', leave);
                win.addEventListener('drop', drop);

                return () => {
                    win.removeEventListener('dragover', over);
                    win.removeEventListener('dragleave', leave);
                    win.removeEventListener('drop', drop);
                };
            },

            // A keyboard is at hand on a desktop: the box is ready. On a phone it would only pop the keyboard up.
            focusOnStart({ prop, scope }) {
                if (
                    prop('initial') !== null ||
                    scope.getWin().matchMedia('(pointer: fine)').matches
                ) {
                    dom.getInputEl(scope)?.focus();
                }
            },

            stopTimers(params) {
                return () => clearTimers(params);
            },
        },
    },
});
