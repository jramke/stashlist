import { prefetchPage } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import {
    connect,
    machine,
    type CardFace,
    type CardStatus,
    type Glyph,
    type Stash,
    type StashCardApi,
} from '@/machines/stash-card';
import { show } from '@/routes/stashes';
import { router } from '@inertiajs/react';
import { mergeProps, normalizeProps, useMachine } from '@zag-js/react';
import {
    Check,
    ChefHat,
    Clapperboard,
    FileText,
    GitBranch,
    GraduationCap,
    Image as ImageIcon,
    Link2,
    LoaderCircle,
    MessagesSquare,
    Newspaper,
    Palette,
    Play,
    Quote,
    ShoppingBag,
    Sparkles,
    StickyNote,
    TriangleAlert,
    type LucideIcon,
} from 'lucide-react';
import {
    useId,
    useRef,
    type MouseEvent,
    type PointerEvent,
    type ReactNode,
} from 'react';

/** The small picture of each kind of stash, top left on the card. */
export const glyphIcons: Record<Glyph, LucideIcon> = {
    link: Link2,
    article: Newspaper,
    product: ShoppingBag,
    video: Clapperboard,
    social: MessagesSquare,
    repo: GitBranch,
    paper: GraduationCap,
    recipe: ChefHat,
    quote: Quote,
    note: StickyNote,
    image: ImageIcon,
    file: FileText,
    color: Palette,
};

type Props = {
    stash: Stash;
    /** The stash was just saved: the card comes in with a short entrance. */
    fresh?: boolean;
    /** The list has this card highlighted with the keyboard. */
    highlighted?: boolean;
    /** Show it as if the pointer were on it (the playground). */
    peek?: boolean;
    /** Props of a listbox item (zag): the card then is that item, and the list decides what a click does. */
    itemProps?: Record<string, unknown> | undefined;
    /** Not a link: no address, no prefetch. For the playground, where the stashes are made up. */
    inert?: boolean;
    className?: string;
};

/**
 * A stash as a square on a gray ground: the type and subtype in the top left corner, what the pipeline is doing
 * in the top right, the middle (a picture in its own ratio, a swatch, a note, a file or a tile) and the title on
 * one line below. The picture grows a little under the pointer and when the keyboard is on the card. All of what
 * the card is doing is a machine (`machines/stash-card`); this file only draws it.
 */
export function StashCard({
    stash,
    fresh = false,
    highlighted = false,
    peek = false,
    itemProps,
    inert = false,
    className,
}: Props) {
    const service = useMachine(machine, {
        id: useId(),
        stash,
        fresh,
        highlighted,
        peek,
    });
    const api = connect(service, normalizeProps);
    const href = show(stash.id).url;
    const hover = useRef<number>(undefined);

    // Opening a card is the page's business: in a list the list sends the click on (it knows the card is
    // selected); alone, the card opens itself. A modifier click is the browser's, for a new tab.
    const open = (event: MouseEvent) => {
        if (isPlainClick(event)) {
            event.preventDefault();

            if (itemProps === undefined) {
                router.visit(href);
            }
        }
    };

    const merged = mergeProps(
        inert
            ? {}
            : {
                  // Warms the page of the card while the pointer rests on it, so opening it is instant.
                  onPointerEnter: (event: PointerEvent) => {
                      if (event.pointerType === 'mouse') {
                          hover.current = window.setTimeout(
                              () => prefetchPage(href),
                              80,
                          );
                      }
                  },
                  onPointerLeave: () => clearTimeout(hover.current),
                  onClick: open,
              },
        itemProps,
        api.getRootProps(),
    );
    const Root = inert ? 'div' : 'a';

    return (
        <Root
            {...merged}
            {...(inert ? {} : { href })}
            className={cn(
                'group/card relative block aspect-square scroll-mt-24 scroll-mb-4 overflow-hidden rounded-[1.25rem] bg-surface text-foreground transition-[background-color,box-shadow,transform] duration-150 outline-none select-none hover:bg-surface-hover active:scale-[0.985] data-[fresh]:animate-stash-in data-[highlighted]:ring-3 data-[highlighted]:ring-ring/60 data-[peek]:bg-surface-hover',
                className,
            )}
        >
            <CardBody api={api} />
        </Root>
    );
}

/** A click that means "open it here", as against a modifier click, which is the browser's to open elsewhere. */
function isPlainClick(event: MouseEvent): boolean {
    return (
        event.button === 0 &&
        !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    );
}

function CardBody({ api }: { api: StashCardApi }) {
    const { face } = api;
    const Indicator = glyphIcons[api.indicator.glyph];

    return (
        <div {...api.getSurfaceProps()} className="absolute inset-0">
            <span
                {...api.getIndicatorProps()}
                className="absolute top-3 left-3 z-10 text-foreground/40 transition-colors group-hover/card:text-foreground/60 group-data-[peek]/card:text-foreground/60"
            >
                <Indicator className="size-4" strokeWidth={1.75} />
                <span className="sr-only">{api.indicator.label}</span>
            </span>

            <div
                {...api.getStatusesProps()}
                className="absolute top-3 right-3 z-10 flex items-center gap-1.5 text-foreground/45"
            >
                {api.statuses.map((status) => (
                    <Status key={status.kind} api={api} status={status} />
                ))}
            </div>

            <Face api={api} face={face} />

            <p
                {...api.getTitleProps()}
                className={cn(
                    'absolute inset-x-3 bottom-3 truncate text-center text-[13px] leading-5 font-medium text-foreground/80 transition-colors group-hover/card:text-foreground group-data-[peek]/card:text-foreground data-[empty]:hidden',
                    face.kind === 'swatch' && 'font-mono text-xs tracking-wide',
                )}
            >
                {api.title}
            </p>
        </div>
    );
}

function Status({ api, status }: { api: StashCardApi; status: CardStatus }) {
    return (
        <span {...api.getStatusProps(status)} className="flex">
            {status.kind === 'fetching' && (
                <LoaderCircle className="size-3.5 animate-spin" />
            )}
            {status.kind === 'tagging' && (
                <Sparkles className="size-3.5 animate-pulse" />
            )}
            {status.kind === 'failed' && (
                <TriangleAlert className="size-3.5 text-destructive" />
            )}
            {status.kind === 'arrived' && (
                <Check className="size-3.5 animate-note-in" />
            )}
            <span className="sr-only">{status.label}</span>
        </span>
    );
}

/** The middle of the card. */
function Face({ api, face }: { api: StashCardApi; face: CardFace }) {
    if (face.kind === 'note') {
        return <NoteFace api={api} face={face} />;
    }

    return (
        <div
            {...api.getMediaProps()}
            className="absolute inset-x-3.5 top-9 bottom-9 grid grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] place-items-center transition-transform duration-200 ease-out group-hover/card:scale-[1.06] group-data-[peek]/card:scale-[1.06]"
        >
            {face.kind === 'photo' && <PhotoFace api={api} face={face} />}
            {face.kind === 'swatch' && (
                <div
                    {...api.getSwatchProps()}
                    className="aspect-square h-full max-w-full rounded-2xl shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1),0_1px_2px_rgb(0_0_0/0.06)]"
                    style={{ backgroundColor: face.color }}
                />
            )}
            {face.kind === 'tile' && <TileFace api={api} face={face} />}
            {face.kind === 'file' && <FileFace api={api} face={face} />}
        </div>
    );
}

function PhotoFace({
    api,
    face,
}: {
    api: StashCardApi;
    face: Extract<CardFace, { kind: 'photo' }>;
}) {
    return (
        <>
            <img
                {...api.getImageProps()}
                ref={(image) => {
                    // A picture the browser already had is complete before React is.
                    if (image?.complete && image.naturalWidth > 0) {
                        api.mediaLoaded();
                    }
                }}
                src={face.src}
                width={face.width ?? undefined}
                height={face.height ?? undefined}
                className="h-auto max-h-full w-auto max-w-full rounded-lg object-contain opacity-0 shadow-[0_0_0_1px_rgb(0_0_0/0.08),0_2px_8px_rgb(0_0_0/0.08)] transition-opacity duration-200 data-[media=loaded]:opacity-100"
                style={
                    face.tint === null
                        ? undefined
                        : { backgroundColor: face.tint }
                }
            />
            {face.play && (
                <span
                    {...api.getOverlayProps()}
                    className="pointer-events-none absolute grid size-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm"
                >
                    <Play className="size-4 translate-x-px fill-current" />
                </span>
            )}
        </>
    );
}

function TileFace({
    api,
    face,
}: {
    api: StashCardApi;
    face: Extract<CardFace, { kind: 'tile' }>;
}) {
    const Glyph = glyphIcons[face.glyph];

    return (
        <div
            {...api.getTileProps()}
            className="grid aspect-square h-[4.5rem] max-h-full place-items-center rounded-[1.1rem] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)] data-[skeleton]:animate-pulse"
            style={{
                background: `linear-gradient(145deg, oklch(0.95 0.025 ${face.hue}), oklch(0.9 0.05 ${face.hue + 25}))`,
                color: `oklch(0.42 0.1 ${face.hue})`,
            }}
        >
            {face.monogram === null ? (
                <Glyph className="size-7" strokeWidth={1.5} />
            ) : (
                <span className="text-2xl leading-none font-semibold">
                    {face.monogram}
                </span>
            )}
        </div>
    );
}

function FileFace({
    api,
    face,
}: {
    api: StashCardApi;
    face: Extract<CardFace, { kind: 'file' }>;
}) {
    return (
        <div
            {...api.getFileProps()}
            className="relative flex h-[4.75rem] max-h-full w-14 items-end rounded-md bg-white p-1.5 shadow-[0_0_0_1px_rgb(0_0_0/0.08),0_2px_6px_rgb(0_0_0/0.06)] [clip-path:polygon(0_0,68%_0,100%_26%,100%_100%,0_100%)]"
        >
            <span className="text-[10px] leading-none font-bold tracking-wider text-foreground/55">
                {face.extension}
            </span>
        </div>
    );
}

function NoteFace({
    api,
    face,
}: {
    api: StashCardApi;
    face: Extract<CardFace, { kind: 'note' }>;
}): ReactNode {
    return (
        <p
            {...api.getTextProps()}
            className={cn(
                'absolute inset-x-0 top-9 overflow-hidden [mask-image:linear-gradient(to_bottom,black_calc(100%-2.25rem),transparent)] px-4 text-[13px] leading-[1.45] whitespace-pre-wrap text-foreground/80 data-[quote]:font-serif data-[quote]:text-sm data-[quote]:italic',
                api.title === null ? 'bottom-0 pb-4' : 'bottom-9',
            )}
        >
            {face.quote && (
                <span className="mr-0.5 text-lg leading-none text-foreground/35 not-italic">
                    &ldquo;
                </span>
            )}
            {face.text}
        </p>
    );
}
