import { cn } from '@/lib/utils';
import { Link2, Palette, Search, StickyNote } from 'lucide-react';

type Sample =
    | { kind: 'color'; hex: string }
    | { kind: 'note'; text: string }
    | { kind: 'link'; title: string; domain: string; hue: number };

const columns: Sample[][] = [
    [
        {
            kind: 'link',
            title: 'How to raise a sourdough starter',
            domain: 'breadlab.example',
            hue: 38,
        },
        { kind: 'color', hex: '#2a9d8f' },
        {
            kind: 'note',
            text: 'Ask the bakery on Elm street about the rye flour.',
        },
    ],
    [
        {
            kind: 'note',
            text: 'The best ideas arrive while walking. Take a notebook, never a phone.',
        },
        {
            kind: 'link',
            title: 'Type specimens, 1890 to 1960',
            domain: 'letterforms.example',
            hue: 210,
        },
        { kind: 'color', hex: '#e63946' },
    ],
    [
        { kind: 'color', hex: '#264653' },
        {
            kind: 'link',
            title: 'A small guide to gradients',
            domain: 'colorbook.example',
            hue: 320,
        },
        {
            kind: 'link',
            title: 'Notes on kitchen lighting',
            domain: 'homestudy.example',
            hue: 95,
        },
    ],
];

const icons = { link: Link2, note: StickyNote, color: Palette };

/** What the app looks like, drawn with the app's own look instead of a screenshot that goes stale. */
export function ProductPreview({ className }: { className?: string }) {
    return (
        <div
            role="img"
            aria-label="The Stashlist feed: one box on top, below it links, notes and colors in columns."
            className={cn('relative min-w-0', className)}
        >
            <div className="rounded-2xl border bg-muted/60 p-2 shadow-inner sm:p-3">
                <div className="grid min-w-0 gap-4 rounded-xl border bg-background p-3 sm:p-4">
                    <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 shadow-sm">
                        <Search className="size-4 shrink-0 text-muted-foreground" />
                        <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-foreground/10 bg-muted pr-2.5 pl-2 font-medium">
                            <span className="size-3 rounded-full bg-[#e5484d]" />
                            red
                        </span>
                        <span className="min-w-0 truncate text-muted-foreground">
                            Search, or paste anything to stash
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                        {columns.map((column, index) => (
                            <div
                                key={index}
                                className={cn(
                                    'grid min-w-0 content-start gap-4',
                                    index === 2 && 'hidden sm:grid',
                                )}
                            >
                                {column.map((sample, row) => (
                                    <Card key={row} sample={sample} />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1/2 rounded-b-2xl bg-gradient-to-t from-background to-background/0" />
        </div>
    );
}

function Card({ sample }: { sample: Sample }) {
    const Icon = icons[sample.kind];

    return (
        <div className="min-w-0 overflow-hidden rounded-2xl border bg-card">
            {sample.kind === 'color' && (
                <div className="h-24" style={{ backgroundColor: sample.hex }} />
            )}
            {sample.kind === 'link' && (
                <div
                    className="h-20"
                    style={{
                        background: `linear-gradient(135deg, hsl(${sample.hue} 45% 94%), hsl(${(sample.hue + 40) % 360} 45% 88%))`,
                    }}
                />
            )}

            <div className="grid gap-1.5 px-3.5 py-3">
                {sample.kind === 'link' && (
                    <p className="line-clamp-2 font-medium">{sample.title}</p>
                )}
                {sample.kind === 'note' && (
                    <p className="line-clamp-4 text-foreground/80">
                        {sample.text}
                    </p>
                )}
                {sample.kind === 'color' && (
                    <p className="font-mono text-muted-foreground uppercase">
                        {sample.hex}
                    </p>
                )}
                <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon className="size-3.5 shrink-0" />
                    <span className="truncate">
                        {sample.kind === 'link' ? sample.domain : ''}
                    </span>
                </p>
            </div>
        </div>
    );
}
