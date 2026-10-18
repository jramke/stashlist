import { StashCard } from '@/components/stash-card';
import { StashGrid } from '@/components/stash-grid';
import { Button } from '@/components/ui/button';
import { useStashGrid } from '@/hooks/use-stash-grid';
import type { Stash } from '@/machines/stash-card';
import {
    art,
    LONG_NOTE,
    pipeline,
    PLAIN_SITES,
    stash,
    subtype,
    SUBTYPES,
} from '@/playground/fixtures';
import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/** One card with its label under it. */
function Case({
    label,
    stash: item,
    ...state
}: {
    label: string;
    stash: Stash;
    peek?: boolean;
    highlighted?: boolean;
}) {
    return (
        <figure className="grid content-start gap-2">
            <StashCard stash={item} inert {...state} />
            <figcaption className="text-center text-xs text-muted-foreground">
                {label}
            </figcaption>
        </figure>
    );
}

function Section({
    title,
    children,
    description,
    action,
}: {
    title: string;
    description?: string;
    /** A button for the section, under its description. */
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="grid gap-4">
            <header className="grid justify-items-start gap-1">
                <h2 className="text-sm font-medium">{title}</h2>
                {description !== undefined && (
                    <p className="max-w-2xl text-xs text-muted-foreground">
                        {description}
                    </p>
                )}
                {action}
            </header>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
                {children}
            </div>
        </section>
    );
}

type Step = 'fetching' | 'tagging' | 'ready' | 'failed';

/** One stash that goes through the pipeline while you watch: the card is the same card all along. */
function PipelineDemo() {
    const [step, setStep] = useState<Step>('ready');
    const timers = useRef<number[]>([]);
    const item = useMemo(() => pipeline(step, 4242), [step]);

    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    function run(fail: boolean) {
        timers.current.forEach(clearTimeout);
        setStep('fetching');
        timers.current = [
            window.setTimeout(() => setStep(fail ? 'failed' : 'tagging'), 1800),
            window.setTimeout(() => !fail && setStep('ready'), 3800),
        ];
    }

    return (
        <div className="grid gap-3">
            <div className="grid max-w-44 gap-2">
                <StashCard stash={item} inert />
                <p className="text-center text-xs text-muted-foreground">
                    {step}
                </p>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => run(false)}>
                    Run the pipeline
                </Button>
                <Button size="sm" variant="outline" onClick={() => run(true)}>
                    Fail it
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setStep('ready')}
                >
                    Reset
                </Button>
            </div>
        </div>
    );
}

/**
 * Pictures that are slow or never come. They load on a click, because the browser writes the 404 and the 500
 * in its console, and a page that opens with errors in the console is a page nobody trusts. Every click loads
 * them again.
 */
function LostPictures() {
    const [round, setRound] = useState(0);

    return (
        <Section
            title="Pictures on the way, and lost"
            description="Slow: the ground waits. Broken: the card falls back to a tile instead of an empty box. The browser logs the 404 and the 500 in its console; that is the point."
            action={
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRound((count) => count + 1)}
                >
                    {round === 0 ? 'Load the pictures' : 'Load them again'}
                </Button>
            }
        >
            {round > 0 && (
                <>
                    <Case
                        key={`slow-${round}`}
                        label="slow (6 s)"
                        stash={stash({
                            subtype: 'article',
                            ...art(1200, 630, 255, {
                                delay: 6,
                                again: round,
                            }),
                        })}
                    />
                    <Case
                        key={`404-${round}`}
                        label="404"
                        stash={stash({
                            subtype: 'video',
                            title: 'The picture is gone',
                            ...art(1200, 630, 25, {
                                status: 404,
                                again: round,
                            }),
                        })}
                    />
                    <Case
                        key={`500-${round}`}
                        label="500"
                        stash={stash({
                            title: 'The server stumbled',
                            ...art(1200, 630, 100, {
                                status: 500,
                                again: round,
                            }),
                        })}
                    />
                </>
            )}
        </Section>
    );
}

/** How many cards the live grid holds: the last one is for finding out what a long feed costs. */
const COUNTS = [25, 100, 400] as const;

const WIDTHS = {
    narrow: 'max-w-[22rem]',
    medium: 'max-w-3xl',
    wide: 'max-w-none',
} as const;

/** The real list: one tab stop, arrows through rows and columns, Home and End, Enter. */
function LiveGrid() {
    const [width, setWidth] = useState<keyof typeof WIDTHS>('wide');
    const [count, setCount] = useState<(typeof COUNTS)[number]>(COUNTS[0]);
    const [opened, setOpened] = useState<number | null>(null);
    const base = useMemo(
        () => [
            stash({
                type: 'note',
                title: null,
                body: 'buy sourdough flour',
            }),
            ...SUBTYPES.map((name, index) => subtype(name, index % 2 === 0)),
            stash({ type: 'color', title: null, body: '#e63946' }),
            ...PLAIN_SITES.map(([title, domain]) =>
                stash({ title, domain, url: `https://${domain}/x` }),
            ),
            stash({
                type: 'image',
                title: 'IMG_2041.jpg',
                url: null,
                domain: null,
                ...art(900, 1200, 190),
            }),
            stash({ type: 'note', title: null, body: LONG_NOTE }),
            stash({ type: 'color', title: null, body: '#264653' }),
            stash({
                type: 'file',
                title: 'invoice-2026-10.pdf',
                url: null,
                domain: null,
            }),
            stash({
                title: 'Still being read',
                fetching: true,
                ai_status: 'pending',
            }),
            stash({
                title: 'Being tagged',
                tagging: true,
                ai_status: 'processing',
            }),
            stash({
                title: null,
                ai_status: 'failed',
                ai_error: 'The page could not be read.',
            }),
            stash({
                type: 'note',
                title: null,
                body: 'call the plumber',
                subtype: 'quote',
            }),
        ],
        [],
    );
    // The list needs a value of its own for every item, and more of them than there are fixtures when asked.
    const items = useMemo(() => {
        const list: Stash[] = [];

        for (let index = 0; index < count; index++) {
            const item = base[index % base.length];

            if (item !== undefined) {
                list.push({ ...item, id: 9000 + index });
            }
        }

        return list;
    }, [base, count]);
    const grid = useStashGrid(items, (id) => setOpened(id));

    return (
        <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {(Object.keys(WIDTHS) as (keyof typeof WIDTHS)[]).map(
                    (name) => (
                        <Button
                            key={name}
                            size="xs"
                            variant={width === name ? 'default' : 'outline'}
                            onClick={() => setWidth(name)}
                        >
                            {name}
                        </Button>
                    ),
                )}
                {COUNTS.map((amount) => (
                    <Button
                        key={amount}
                        size="xs"
                        variant={count === amount ? 'default' : 'outline'}
                        onClick={() => setCount(amount)}
                    >
                        {amount} cards
                    </Button>
                ))}
                <span>
                    {grid.columns} columns
                    {opened !== null && ` · opened #${opened}`}
                    {' · '}
                    Tab in, then arrows, Home, End, Enter.
                </span>
            </div>
            <div className={WIDTHS[width]}>
                <StashGrid
                    grid={grid}
                    stashes={items}
                    freshAfter={null}
                    inert
                    onLeaveTop={() => undefined}
                />
            </div>
        </div>
    );
}

export default function Cards() {
    return (
        <>
            <Head title="Card playground" />

            <div className="mx-auto grid max-w-7xl gap-12 pb-24">
                <header className="grid gap-1">
                    <h1 className="text-xl font-medium">Stash cards</h1>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                        Every kind and every state of a card, made up. The
                        pictures come from /playground/art, which can be slow or
                        broken on request.
                    </p>
                </header>

                <Section
                    title="Types"
                    description="What a stash is: the glyph in the top left corner, a face in the middle, the title on one line."
                >
                    <Case
                        label="link, with a page picture"
                        stash={subtype('article', true)}
                    />
                    <Case
                        label="note"
                        stash={stash({
                            type: 'note',
                            title: null,
                            body: 'buy sourdough flour, a good scale and a banneton before the weekend',
                        })}
                    />
                    <Case
                        label="image"
                        stash={stash({
                            type: 'image',
                            title: 'IMG_2041.jpg',
                            url: null,
                            domain: null,
                            ...art(1200, 800, 190),
                        })}
                    />
                    <Case
                        label="file"
                        stash={stash({
                            type: 'file',
                            title: 'invoice-2026-10.pdf',
                            url: null,
                            domain: null,
                        })}
                    />
                    <Case
                        label="color"
                        stash={stash({
                            type: 'color',
                            title: null,
                            body: '#e63946',
                        })}
                    />
                </Section>

                <Section
                    title="Links by subtype, with a picture"
                    description="The picture stays in its own ratio. The subtype shows in the corner; a video also gets a play button."
                >
                    {SUBTYPES.map((name) => (
                        <Case
                            key={name}
                            label={name}
                            stash={subtype(name, true)}
                        />
                    ))}
                </Section>

                <Section
                    title="Links by subtype, without a picture"
                    description="A tile with the glyph of the subtype, tinted toward its own hue."
                >
                    {SUBTYPES.map((name) => (
                        <Case
                            key={name}
                            label={name}
                            stash={subtype(name, false)}
                        />
                    ))}
                </Section>

                <Section
                    title="Plain links, without a picture"
                    description="The first letter of the site on a tint taken from the site: the same site always looks the same."
                >
                    {PLAIN_SITES.map(([title, domain]) => (
                        <Case
                            key={domain}
                            label={domain}
                            stash={stash({
                                title,
                                domain,
                                url: `https://${domain}/x`,
                            })}
                        />
                    ))}
                </Section>

                <Section
                    title="Notes"
                    description="The text on the ground, with a little room, fading out at the bottom when it is longer. A quote is set in a serif italic."
                >
                    <Case
                        label="short"
                        stash={stash({
                            type: 'note',
                            title: null,
                            body: 'call the plumber',
                        })}
                    />
                    <Case
                        label="a few lines"
                        stash={stash({
                            type: 'note',
                            title: null,
                            body: 'The best ideas arrive while walking. Take a notebook, never a phone.',
                        })}
                    />
                    <Case
                        label="long, fades out"
                        stash={stash({
                            type: 'note',
                            title: null,
                            body: LONG_NOTE,
                        })}
                    />
                    <Case
                        label="with a title"
                        stash={stash({
                            type: 'note',
                            title: 'Week plan',
                            body: LONG_NOTE,
                        })}
                    />
                    <Case
                        label="quote"
                        stash={stash({
                            type: 'note',
                            subtype: 'quote',
                            title: null,
                            body: 'Simplicity is hard to build, easy to use, and hard to charge for.',
                        })}
                    />
                </Section>

                <Section
                    title="Colors"
                    description="The swatch, with the code under it. A white one gets an edge so it can be seen."
                >
                    {[
                        '#e63946',
                        '#2a9d8f',
                        '#264653',
                        '#f4a261',
                        '#ffffff',
                        '#fdf6e3',
                    ].map((color) => (
                        <Case
                            key={color}
                            label={color}
                            stash={stash({
                                type: 'color',
                                title: null,
                                body: color,
                            })}
                        />
                    ))}
                </Section>

                <Section
                    title="Pictures of every shape"
                    description="Fitted into the middle without cropping, whatever the ratio."
                >
                    {(
                        [
                            ['landscape 16:9', 1280, 720, 200],
                            ['page picture 1.91:1', 1200, 630, 20],
                            ['square', 800, 800, 140],
                            ['portrait 3:4', 900, 1200, 300],
                            ['tall 9:16', 720, 1280, 60],
                            ['panorama 3:1', 1800, 600, 170],
                            ['tiny', 48, 48, 330],
                        ] as const
                    ).map(([label, width, height, hue]) => (
                        <Case
                            key={label}
                            label={label}
                            stash={stash({
                                type: 'image',
                                title: label,
                                url: null,
                                domain: null,
                                ...art(width, height, hue),
                            })}
                        />
                    ))}
                </Section>

                <Section
                    title="Prices"
                    description="A price the page states sits at the top right, next to what the pipeline is doing. No locale: the same text on the server and in the browser."
                >
                    {(
                        [
                            ['euros', '39.90', 'EUR'],
                            ['dollars, thousands', '1299.00', 'USD'],
                            ['whole, no cents', '30.00', 'GBP'],
                            ['yen', '4980', 'JPY'],
                            ['a code, no sign', '299', 'SEK'],
                            ['no currency', '12.5', null],
                        ] as const
                    ).map(([label, amount, currency]) => (
                        <Case
                            key={label}
                            label={label}
                            stash={stash({
                                subtype: 'product',
                                title: 'Cast iron skillet 26 cm',
                                price: { amount, currency },
                                ...art(1200, 630, 65),
                            })}
                        />
                    ))}
                    <Case
                        label="price and a phase"
                        stash={stash({
                            subtype: 'product',
                            title: 'Cast iron skillet 26 cm',
                            tagging: true,
                            ai_status: 'processing',
                            price: { amount: '39.90', currency: 'EUR' },
                            ...art(1200, 630, 65),
                        })}
                    />
                </Section>

                <Section
                    title="Titles"
                    description="One line, centered, cut off with an ellipsis. Without a title the site stands in; a note has none."
                >
                    <Case
                        label="long"
                        stash={stash({
                            title: 'An exceptionally long title that would never fit on one line of a card',
                            subtype: 'article',
                            ...art(1200, 630, 255),
                        })}
                    />
                    <Case
                        label="no title: the site"
                        stash={stash({
                            title: null,
                            domain: 'breadlab.example',
                        })}
                    />
                    <Case
                        label="not latin"
                        stash={stash({
                            title: '日本語のタイトルがここに入ります',
                            domain: 'example.jp',
                        })}
                    />
                </Section>

                <Section
                    title="Phases"
                    description="Where the stash is in the pipeline, shown in the top right corner: read by the server, tagged by the model, done, or failed."
                >
                    <Case label="fetching" stash={pipeline('fetching', 5001)} />
                    <Case label="tagging" stash={pipeline('tagging', 5002)} />
                    <Case label="ready" stash={pipeline('ready', 5003)} />
                    <Case label="failed" stash={pipeline('failed', 5004)} />
                </Section>

                <section className="grid gap-4">
                    <header className="grid gap-1">
                        <h2 className="text-sm font-medium">
                            The pipeline, live
                        </h2>
                        <p className="max-w-2xl text-xs text-muted-foreground">
                            The same card from fetching to done: the picture
                            arrives when the page has been read, and a check
                            shows for a moment when it is finished.
                        </p>
                    </header>
                    <PipelineDemo />
                </section>

                <LostPictures />

                <Section
                    title="Under the pointer and under the keyboard"
                    description="The picture grows a little and the ground darkens. With the keyboard on the card there is also a ring."
                >
                    <Case label="at rest" stash={subtype('article', true)} />
                    <Case
                        label="pointer on it"
                        stash={subtype('article', true)}
                        peek
                    />
                    <Case
                        label="keyboard on it"
                        stash={subtype('article', true)}
                        highlighted
                    />
                    <Case
                        label="note, pointer"
                        stash={stash({
                            type: 'note',
                            title: null,
                            body: LONG_NOTE,
                        })}
                        peek
                    />
                    <Case
                        label="tile, keyboard"
                        stash={subtype('repo', false)}
                        highlighted
                    />
                </Section>

                <section className="grid gap-4">
                    <header className="grid gap-1">
                        <h2 className="text-sm font-medium">The grid</h2>
                        <p className="max-w-2xl text-xs text-muted-foreground">
                            The list the feed uses: a plain CSS grid, one tab
                            stop, the keyboard through rows and columns.
                        </p>
                    </header>
                    <LiveGrid />
                </section>
            </div>
        </>
    );
}
