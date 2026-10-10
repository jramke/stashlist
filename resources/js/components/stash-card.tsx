import { Badge } from '@/components/ui/badge';
import { show } from '@/routes/stashes';
import { Link } from '@inertiajs/react';
import {
    File,
    Image as ImageIcon,
    Link2,
    Loader2,
    Lock,
    Palette,
    StickyNote,
    TriangleAlert,
    type LucideIcon,
} from 'lucide-react';

const typeIcons = {
    link: Link2,
    note: StickyNote,
    image: ImageIcon,
    file: File,
    color: Palette,
} satisfies Record<App.Enums.StashType, LucideIcon>;

const MAX_TAGS_ON_CARD = 3;

/** A stash as a card in the feed. */
export function StashCard({ stash }: { stash: App.Data.StashData }) {
    const Icon = typeIcons[stash.type];
    const tags = stash.tags.slice(0, MAX_TAGS_ON_CARD);

    return (
        <Link
            href={show(stash.id)}
            prefetch
            className="group mb-4 block break-inside-avoid overflow-hidden rounded-xl border bg-card text-card-foreground transition-colors outline-none hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
            <Cover stash={stash} />

            <div className="grid gap-2 p-3">
                {stash.title !== null && (
                    <h3 className="line-clamp-2 text-sm leading-snug font-medium">
                        {stash.title}
                    </h3>
                )}

                {stash.type === 'note' && stash.body !== null && (
                    <p className="line-clamp-8 text-sm whitespace-pre-wrap text-muted-foreground">
                        {stash.body}
                    </p>
                )}

                {stash.description !== null && stash.type === 'link' && (
                    <p className="line-clamp-3 text-xs text-muted-foreground">
                        {stash.description}
                    </p>
                )}

                {tags.length > 0 && (
                    <ul className="flex flex-wrap gap-1">
                        {tags.map((tag) => (
                            <li key={tag.id}>
                                <Badge variant="secondary">{tag.name}</Badge>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon
                        className="size-3.5 shrink-0"
                        aria-label={stash.type}
                    />
                    <span className="truncate">{stash.domain}</span>
                    <span className="ml-auto flex items-center gap-2">
                        {stash.fetching && (
                            <span className="flex items-center gap-1">
                                <Loader2 className="size-3.5 animate-spin" />
                                Fetching
                            </span>
                        )}
                        {stash.ai_status === 'failed' && (
                            <span
                                className="flex items-center gap-1 text-destructive"
                                title={stash.ai_error ?? undefined}
                            >
                                <TriangleAlert className="size-3.5" />
                                Failed
                            </span>
                        )}
                        {stash.is_private && (
                            <Lock className="size-3.5" aria-label="Private" />
                        )}
                    </span>
                </div>
            </div>
        </Link>
    );
}

/** The picture of a card: the thumbnail, the color itself, or a quiet gradient while there is nothing yet. */
function Cover({ stash }: { stash: App.Data.StashData }) {
    if (stash.thumbnail !== null) {
        const { url, width, height } = stash.thumbnail;

        return (
            <img
                src={url}
                alt=""
                width={width ?? undefined}
                height={height ?? undefined}
                loading="lazy"
                className="w-full bg-muted object-cover"
            />
        );
    }

    if (stash.type === 'color') {
        return (
            <div
                className="h-28"
                style={{ backgroundColor: stash.body ?? undefined }}
            />
        );
    }

    if (stash.type === 'note') {
        return null;
    }

    return <div className="h-24" style={{ background: gradient(stash.id) }} />;
}

/** The same stash always gets the same gradient, so no column is needed to remember it. */
function gradient(id: number): string {
    const hue = (id * 47) % 360;

    return `linear-gradient(135deg, hsl(${hue} 30% 28%), hsl(${(hue + 40) % 360} 30% 18%))`;
}
