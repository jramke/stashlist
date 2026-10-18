import { cn } from '@/lib/utils';
import { show } from '@/routes/stashes';
import { Link } from '@inertiajs/react';
import {
    File,
    Image as ImageIcon,
    Link2,
    Loader2,
    Palette,
    StickyNote,
    TriangleAlert,
    type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

const typeIcons = {
    link: Link2,
    note: StickyNote,
    image: ImageIcon,
    file: File,
    color: Palette,
} satisfies Record<App.Enums.StashType, LucideIcon>;

/**
 * A stash as a card in the feed: the picture, a title, where it came from. Nothing else, so the feed reads as a
 * wall of what you saved. `fresh` plays the entrance of a stash that was just saved.
 */
export function StashCard({
    stash,
    fresh = false,
}: {
    stash: App.Data.StashData;
    fresh?: boolean;
}) {
    const Icon = typeIcons[stash.type];

    return (
        <Link
            href={show(stash.id)}
            prefetch
            data-card
            data-stash={stash.id}
            className={cn(
                'group mb-4 block scroll-mt-24 break-inside-avoid overflow-hidden rounded-2xl border bg-card text-card-foreground transition-[border-color,transform,box-shadow] duration-150 outline-none focus-visible:border-foreground/40 focus-visible:shadow-md active:scale-[0.985] [@media(hover:hover)]:hover:border-foreground/25',
                fresh && 'animate-stash-in',
            )}
        >
            <Cover stash={stash} />

            <div className="grid gap-1.5 px-3.5 py-3">
                {stash.title !== null && (
                    <h3 className="line-clamp-2 text-sm leading-snug font-medium">
                        {stash.title}
                    </h3>
                )}

                {stash.type === 'note' && stash.body !== null && (
                    <p className="line-clamp-8 text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
                        {stash.body}
                    </p>
                )}

                {stash.type === 'color' && (
                    <p className="font-mono text-xs text-muted-foreground uppercase">
                        {stash.body}
                    </p>
                )}

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon
                        className="size-3.5 shrink-0"
                        role="img"
                        aria-label={stash.type}
                    />
                    <span className="truncate">{stash.domain}</span>
                    <span className="ml-auto flex shrink-0 items-center gap-2">
                        {stash.fetching && (
                            <span className="flex items-center gap-1">
                                <Loader2 className="size-3 animate-spin" />
                                Fetching
                            </span>
                        )}
                        {!stash.fetching && stash.tagging && (
                            <span className="flex items-center gap-1">
                                <Loader2 className="size-3 animate-spin" />
                                Tagging
                            </span>
                        )}
                        {stash.ai_status === 'failed' && (
                            <span
                                className="flex items-center gap-1 text-destructive"
                                title={stash.ai_error ?? undefined}
                            >
                                <TriangleAlert className="size-3" />
                                Failed
                            </span>
                        )}
                    </span>
                </div>
            </div>
        </Link>
    );
}

/** The picture of a card: the thumbnail, the color itself, or a quiet tint while there is nothing yet. */
function Cover({ stash }: { stash: App.Data.StashData }) {
    const [loaded, setLoaded] = useState(false);

    if (stash.thumbnail !== null) {
        const { url, width, height } = stash.thumbnail;

        return (
            <img
                ref={(node) => {
                    // A picture from the cache is there before React is.
                    if (node?.complete) {
                        setLoaded(true);
                    }
                }}
                src={url}
                alt=""
                width={width ?? undefined}
                height={height ?? undefined}
                loading="lazy"
                onLoad={() => setLoaded(true)}
                className={cn(
                    'w-full bg-muted object-cover outline -outline-offset-1 outline-black/10 transition-opacity duration-200',
                    loaded ? 'opacity-100' : 'opacity-0',
                )}
                // The main color of the picture fills the space until the picture has loaded.
                style={{ backgroundColor: stash.colors[0]?.hex }}
            />
        );
    }

    if (stash.type === 'color') {
        return (
            <div
                className="h-32"
                style={{ backgroundColor: stash.body ?? undefined }}
            />
        );
    }

    if (stash.type === 'note') {
        return null;
    }

    return <div className="h-20" style={{ background: tint(stash.id) }} />;
}

/** The same stash always gets the same tint, so no column is needed to remember it. */
function tint(id: number): string {
    const hue = (id * 47) % 360;

    return `linear-gradient(135deg, hsl(${hue} 45% 94%), hsl(${(hue + 40) % 360} 45% 88%))`;
}
