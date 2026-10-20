import type { Classified } from '@/lib/classify';
import type { SearchMode } from '@/lib/feed-url';
import type { Machine, Service } from '@zag-js/core';
import type {
    CommonProperties,
    NormalizeProps,
    PropTypes,
} from '@zag-js/types';

export type Filters = App.Data.FeedFiltersData;

/** What the box holds, as far as Enter is concerned: nothing, a link, a color code, or words. */
export type Kind = Classified;

/** A filter that is on, shown as a chip in the box. */
export interface Chip {
    key: string;
    label: string;
    swatch?: string;
    /** What the filters become when the chip goes. */
    without: Partial<Filters>;
    /** The word the chip came from, put back in the box when the chip goes (a color word is also a word to search). */
    word?: string;
}

/** What a row of the list does when it is taken. */
export type RowAction =
    /** Turn a filter on; `rest` is what stays in the box. */
    | { type: 'filter'; rest: string; change: Partial<Filters> }
    /** Open the file picker. */
    | { type: 'upload' };

/** One line of the list under the box: a filter to turn on, or an action. */
export interface Row {
    key: string;
    kind: string;
    label: string;
    swatch?: string;
    action: RowAction;
}

/** What the box sends to the server to stash: the typed or dropped thing, with the chips that come along. */
export type StashPayload = {
    input?: string;
    image?: File;
    tags: string[];
    collection_ids: number[];
};

/** The box asks the page for the feed; the page says `settled` when the request is over, whatever came of it. */
export interface VisitRequest {
    url: string;
    replace: boolean;
    settled: () => void;
}

/** The box asks the page to stash something; the page reports how it went. */
export interface StashRequest {
    payload: StashPayload;
    succeeded: () => void;
    failed: (message: string) => void;
    /** The request is over, whatever came of it. */
    settled: () => void;
}

export interface OmnibarProps extends CommonProperties {
    /** The filters the server last answered with. */
    filters: Filters;
    tags: App.Data.TagData[];
    collections: App.Data.CollectionData[];
    /** Text that comes with the visit (the share sheet): it fills the box and takes the focus. */
    initial?: string | null | undefined;
    /** Whether the box takes the focus when it appears (on a desktop). Unsaid, it does; the feed says no when the keyboard goes back to a card. */
    autoFocus?: boolean | undefined;
    /** The server's last note, shown in the box where the change was made. */
    note?: App.Data.ToastData | null | undefined;
    onVisit: (request: VisitRequest) => void;
    onStash: (request: StashRequest) => void;
    /** A note without an Undo button is old news once the person types again. */
    onNoteDone?: (() => void) | undefined;
    /** A stash was saved. */
    onStashed?: (() => void) | undefined;
    /** Arrow down from the last line of the box: the person wants the cards. */
    onLeave?: (() => void) | undefined;
    /** A `?` was typed as the first key of an empty box: it is the shortcut for the list of shortcuts, not a character. */
    onHelp?: (() => void) | undefined;
    /** Something typed became a filter. */
    onTake?: (() => void) | undefined;
}

/**
 * Where the box is. `idle`: the list is closed. `open`: the list is on offer, either as suggestions for what
 * is typed (`open.suggest`) or, after a click in an empty box, as a menu (`open.menu`). `stashing`: a request
 * to save something is on its way.
 */
export type OmnibarState =
    'idle' | 'open' | 'open.suggest' | 'open.menu' | 'stashing';

export type OmnibarEvent =
    | { type: 'INPUT.CHANGE'; value: string }
    | { type: 'INPUT.ENTER'; modifier: boolean }
    | { type: 'INPUT.ESCAPE' }
    | { type: 'INPUT.LEAVE' }
    | { type: 'LIST.NEXT' }
    | { type: 'LIST.PREVIOUS' }
    | { type: 'LIST.ACCEPT' }
    | { type: 'ROW.HOVER'; index: number }
    | { type: 'ROW.CLICK'; index: number }
    | { type: 'CHIP.POP' }
    | { type: 'CHIP.REMOVE'; key: string }
    | { type: 'POINTER.DOWN' }
    | { type: 'FOCUS.OUT' }
    | { type: 'STASH.TEXT' }
    | { type: 'FILES.STASH'; files: File[] }
    | { type: 'DRAG.OVER' }
    | { type: 'DRAG.LEAVE' }
    | { type: 'DRAG.DROP'; files: File[]; link: string }
    | { type: 'SEARCH.FIRE'; mode: SearchMode }
    | { type: 'FILTERS.SYNC' }
    | { type: 'SHARE.SYNC' }
    | { type: 'VISIT.END'; visit: number }
    | { type: 'STASH.SUCCESS' }
    | { type: 'STASH.FAILURE'; message: string }
    | { type: 'STASH.SETTLED' };

export interface OmnibarSchema {
    state: OmnibarState;
    props: OmnibarProps;
    defaultPropKey: 'initial' | 'note';
    context: {
        /** What is typed. The field itself is the truth while the person types; this follows it. */
        text: string;
        /** The row of the list the keyboard is on, or -1. */
        highlight: number;
        /** Something that can be stashed is being dragged over the page. */
        dragging: boolean;
        error: string | null;
        /** The filters the box has asked for and the server has not answered yet: the chips follow them at once. */
        guess: Filters | null;
    };
    refs: {
        /** What the feed was last asked for. An answer that echoes it is ours; anything else came from outside. */
        requested: string;
        /** How many times the feed was asked for. A request that ends only speaks for its own number. */
        visits: number;
        timers: number[];
        /** The request on its way carries text, which the box empties when it was saved. */
        sentText: boolean;
    };
    computed: {
        /** The filters on show: the server's, or the guess about them until it answers. */
        shown: Filters;
        kind: Kind;
        chips: Chip[];
        suggestions: Row[];
        menu: Row[];
    };
    tag: 'open' | 'busy';
    guard:
        | 'endsInColorWord'
        | 'hasText'
        | 'isModifier'
        | 'pickedIsFilter'
        | 'pickedIsUpload'
        | 'entersLinkOrColor'
        | 'rowIsFilter'
        | 'rowIsUpload'
        | 'isVisible'
        | 'eventHasImage'
        | 'eventHasFiles'
        | 'eventHasLink';
    action:
        | 'noteDone'
        | 'clearError'
        | 'takeColorWord'
        | 'typed'
        | 'typedWhileStashing'
        | 'stashText'
        | 'takePicked'
        | 'takeClicked'
        | 'takeSuggestion'
        | 'openPicker'
        | 'focusInput'
        | 'leave'
        | 'highlightNext'
        | 'highlightPrevious'
        | 'highlightRow'
        | 'resetHighlight'
        | 'popChip'
        | 'dropChip'
        | 'clearSearch'
        | 'blurField'
        | 'runSearch'
        | 'adoptQuery'
        | 'adoptShare'
        | 'forgetGuess'
        | 'dragOver'
        | 'dragLeave'
        | 'endDrag'
        | 'rejectFiles'
        | 'stashImage'
        | 'stashDroppedLink'
        | 'finishStash'
        | 'failStash';
    effect: 'watchDrag' | 'focusOnStart' | 'stopTimers';
    event: OmnibarEvent;
}

export type OmnibarService = Service<OmnibarSchema>;
export type OmnibarMachine = Machine<OmnibarSchema>;

/** What the right-hand end of the box shows: one thing at a time, in this order of importance. */
export type Slot = 'stashing' | 'error' | 'note' | 'action' | 'none';

/** What sits in front of the text. */
export type Leading =
    { kind: 'search' } | { kind: 'link' } | { kind: 'swatch'; color: string };

export interface OmnibarApi<T extends PropTypes = PropTypes> {
    state: 'idle' | 'open' | 'stashing';
    text: string;
    kind: Kind;
    dragging: boolean;
    error: string | null;
    slot: Slot;
    leading: Leading;
    placeholder: string;
    /** What the stash button says. */
    stashLabel: string;
    chips: Chip[];
    /** The rows on offer; empty while the list is closed, or while it has nothing to say. */
    rows: Row[];
    /** The rows are suggestions for the typed word (and not the menu of an empty box). */
    suggesting: boolean;
    visible: boolean;
    highlight: number;
    /** Save what is typed as a link, a color or a note. */
    stashText(): void;
    removeChip(chip: Chip): void;
    getRootProps(): T['element'];
    getFieldProps(): T['element'];
    getLeadingProps(): T['element'];
    getChipProps(chip: Chip): T['element'];
    getChipRemoveProps(chip: Chip): T['button'];
    getInputProps(): T['textarea'];
    getSlotProps(): T['element'];
    getActionProps(): T['button'];
    getDropProps(): T['element'];
    getPopupProps(): T['element'];
    getListProps(): T['element'];
    getRowProps(row: Row, index: number): T['element'];
    getHintProps(): T['element'];
    getPickerProps(): T['input'];
}

export type OmnibarNormalize = NormalizeProps<PropTypes>;
