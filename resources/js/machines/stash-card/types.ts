import type { Machine, Service } from '@zag-js/core';
import type {
    CommonProperties,
    NormalizeProps,
    PropTypes,
} from '@zag-js/types';

export type Stash = App.Data.StashData;

/** Where the card is in the life of a stash: read by the server, tagged by the model, done, or failed. */
export type CardPhase = 'fetching' | 'tagging' | 'ready' | 'failed';

/** What became of the picture of the card. */
export type MediaStatus = 'none' | 'loading' | 'loaded' | 'broken';

/** The small picture that says what kind of thing a stash is: one per type, and one per subtype of a link. */
export type Glyph =
    | 'link'
    | 'article'
    | 'product'
    | 'video'
    | 'social'
    | 'repo'
    | 'paper'
    | 'recipe'
    | 'quote'
    | 'note'
    | 'image'
    | 'file'
    | 'color';

/** What the middle of a card shows. Chosen from the stash and from what became of its picture. */
export type CardFace =
    /** A picture, in its own ratio, with the average color of it behind it while it loads. */
    | {
          kind: 'photo';
          src: string;
          width: number | null;
          height: number | null;
          tint: string | null;
          /** A play button over it: the stash is a video. */
          play: boolean;
      }
    /** The color itself. */
    | { kind: 'swatch'; color: string }
    /** The text of a note, straight on the card. */
    | { kind: 'note'; text: string; quote: boolean }
    /** A document: what the file is, by its extension. */
    | { kind: 'file'; extension: string }
    /** Nothing to show yet, or at all: the glyph of the kind on a tinted tile, or the first letter of the site. */
    | { kind: 'tile'; glyph: Glyph; hue: number; monogram: string | null };

export interface CardIndicator {
    glyph: Glyph;
    label: string;
}

export interface CardStatus {
    kind: 'fetching' | 'tagging' | 'failed' | 'arrived';
    label: string;
    /** Why, when the stash has a reason to give. */
    detail: string | null;
}

export interface StashCardProps extends CommonProperties {
    stash: Stash;
    /** The stash was just saved: its card comes in with a short entrance. */
    fresh?: boolean | undefined;
    /** The list this card is in has it highlighted, which the keyboard moves. */
    highlighted?: boolean | undefined;
    /** Show the card as if the pointer were on it. For the playground; the real hover is CSS. */
    peek?: boolean | undefined;
    /** The stash is done: fetched or tagged. The page may answer with a sound. */
    onArrive?: ((details: { phase: CardPhase }) => void) | undefined;
}

export interface StashCardSchema {
    state: CardPhase;
    props: StashCardProps;
    defaultPropKey: 'stash';
    context: {
        media: MediaStatus;
        /** Set when the card has just become ready from a busy phase, for a moment. */
        arrived: boolean;
    };
    computed: {
        face: CardFace;
        title: string | null;
        indicator: CardIndicator;
        statuses: CardStatus[];
        busy: boolean;
    };
    tag: 'busy' | 'settled';
    guard: 'isFailed' | 'isFetching' | 'isTagging' | 'wasBusy';
    action:
        | 'markArrived'
        | 'clearArrived'
        | 'resetMedia'
        | 'mediaLoaded'
        | 'mediaBroken';
    effect: 'endArrival' | 'checkPicture';
    event:
        | { type: 'PHASE.SYNC' }
        | { type: 'MEDIA.SOURCE' }
        | { type: 'MEDIA.LOAD' }
        | { type: 'MEDIA.ERROR' }
        | { type: 'ARRIVED.END' };
}

export type StashCardService = Service<StashCardSchema>;
export type StashCardMachine = Machine<StashCardSchema>;

export interface StashCardApi<T extends PropTypes = PropTypes> {
    phase: CardPhase;
    busy: boolean;
    arrived: boolean;
    media: MediaStatus;
    face: CardFace;
    title: string | null;
    indicator: CardIndicator;
    statuses: CardStatus[];
    getRootProps(): T['element'];
    getSurfaceProps(): T['element'];
    getMediaProps(): T['element'];
    getImageProps(): T['img'];
    getOverlayProps(): T['element'];
    getTextProps(): T['element'];
    getTileProps(): T['element'];
    getSwatchProps(): T['element'];
    getFileProps(): T['element'];
    getTitleProps(): T['element'];
    getIndicatorProps(): T['element'];
    getStatusesProps(): T['element'];
    getStatusProps(status: CardStatus): T['element'];
}

export type StashCardNormalize = NormalizeProps<PropTypes>;
