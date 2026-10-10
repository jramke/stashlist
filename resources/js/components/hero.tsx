import { cn } from '@/lib/utils';
import {
    Bookmark,
    Camera,
    Code,
    Globe,
    Highlighter,
    Image as ImageIcon,
    Link2,
    Palette,
    StickyNote,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/** What people put in the vault, one icon each. Their places around it are fixed, so nothing shifts when it loads. */
const things: {
    label: string;
    icon: LucideIcon;
    left: string;
    top: string;
    delay: string;
}[] = [
    { label: 'a link', icon: Link2, left: '8%', top: '10%', delay: '0s' },
    {
        label: 'an image',
        icon: ImageIcon,
        left: '40%',
        top: '2%',
        delay: '-1.2s',
    },
    {
        label: 'a color',
        icon: Palette,
        left: '74%',
        top: '10%',
        delay: '-2.4s',
    },
    {
        label: 'a note',
        icon: StickyNote,
        left: '88%',
        top: '40%',
        delay: '-0.6s',
    },
    {
        label: 'a bookmark',
        icon: Bookmark,
        left: '76%',
        top: '72%',
        delay: '-1.8s',
    },
    {
        label: 'a highlight',
        icon: Highlighter,
        left: '42%',
        top: '82%',
        delay: '-3s',
    },
    {
        label: 'a screenshot',
        icon: Camera,
        left: '8%',
        top: '72%',
        delay: '-2.1s',
    },
    { label: 'a snippet', icon: Code, left: '-2%', top: '40%', delay: '-0.3s' },
    { label: 'a tab', icon: Globe, left: '14%', top: '40%', delay: '-1.5s' },
];

/** How long an icon takes to burst and fly in, and how long it is gone before it floats back. */
const FLIGHT = 700;
const GONE = 2200;

/**
 * Nine things around a vault. The page arrives with them in place and still; once it is running they float, and a
 * click bursts one, sends it into the vault and makes the vault shimmer, which also follows the pointer. Every icon
 * is a real button, and with reduced motion nothing moves: the click only says what was kept.
 */
export function Hero() {
    const stage = useRef<HTMLDivElement>(null);
    const vault = useRef<HTMLDivElement>(null);
    const [flying, setFlying] = useState<string | null>(null);
    const [kept, setKept] = useState<string[]>([]);
    const [running, setRunning] = useState(false);
    const timers = useRef<number[]>([]);

    useEffect(() => {
        setRunning(true);

        return () => timers.current.forEach(clearTimeout);
    }, []);

    function keep(label: string, button: HTMLButtonElement) {
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

        setKept((list) => [...list.filter((item) => item !== label), label]);

        if (reduced || vault.current === null || stage.current === null) {
            return;
        }

        const from = button.getBoundingClientRect();
        const to = vault.current.getBoundingClientRect();

        button.style.setProperty(
            '--hero-dx',
            `${to.left + to.width / 2 - (from.left + from.width / 2)}px`,
        );
        button.style.setProperty(
            '--hero-dy',
            `${to.top + to.height / 2 - (from.top + from.height / 2)}px`,
        );
        setFlying(label);

        timers.current.push(
            window.setTimeout(() => {
                // The vault takes it in: restart its shimmer.
                vault.current?.style.setProperty('animation', 'none');
                void vault.current?.offsetWidth;
                vault.current?.style.setProperty(
                    'animation',
                    'hero-shimmer 900ms ease-out',
                );
            }, FLIGHT - 150),
            window.setTimeout(() => setFlying(null), FLIGHT + GONE),
        );
    }

    function follow(event: React.PointerEvent) {
        const box = vault.current?.getBoundingClientRect();

        if (box === undefined) {
            return;
        }

        vault.current?.style.setProperty(
            '--hero-x',
            `${Math.round(((event.clientX - box.left) / box.width) * 100)}%`,
        );
        vault.current?.style.setProperty(
            '--hero-y',
            `${Math.round(((event.clientY - box.top) / box.height) * 100)}%`,
        );
    }

    return (
        <div
            ref={stage}
            onPointerMove={follow}
            className="relative mx-auto aspect-[4/3] w-full max-w-lg select-none"
        >
            <div
                ref={vault}
                data-kept={kept.length}
                className="hero-motion absolute top-1/2 left-1/2 grid h-2/5 w-2/5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-3xl border bg-card"
                style={{
                    backgroundImage:
                        'radial-gradient(circle at var(--hero-x, 50%) var(--hero-y, 30%), color-mix(in oklab, var(--foreground) 10%, transparent), transparent 60%)',
                }}
            >
                <div className="h-1.5 w-1/2 rounded-full bg-foreground/80" />
                <span className="absolute bottom-3 text-xs text-muted-foreground">
                    {kept.length === 0 ? 'Your stash' : `${kept.length} kept`}
                </span>
            </div>

            {things.map(({ label, icon: Icon, left, top, delay }) => (
                <button
                    key={label}
                    type="button"
                    aria-label={`Keep ${label}`}
                    onClick={(event) => keep(label, event.currentTarget)}
                    className={cn(
                        'absolute grid size-12 place-items-center rounded-2xl border bg-background text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
                        running &&
                            flying !== label &&
                            'hero-motion [animation:hero-float_5s_ease-in-out_infinite]',
                        flying === label &&
                            'hero-motion [animation:hero-poof_700ms_ease-in_forwards]',
                    )}
                    style={{
                        left,
                        top,
                        animationDelay: flying === label ? undefined : delay,
                    }}
                >
                    <Icon className="size-5" />
                </button>
            ))}

            <p aria-live="polite" className="sr-only">
                {kept.length === 0
                    ? ''
                    : `Kept ${kept[kept.length - 1]}. ${kept.length} of ${things.length} in your stash.`}
            </p>
        </div>
    );
}
