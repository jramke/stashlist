import { LogoPoof } from '@/components/logo-poof';
import {
    Bookmark,
    Chrome,
    Codepen,
    Colors,
    Dribbble,
    GitHub,
    Picture,
    Star,
    Text,
} from '@/components/logos';
import { cn } from '@/lib/utils';
import { LazyMotion, domAnimation, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import {
    useEffect,
    useRef,
    useState,
    type ComponentType,
    type ReactNode,
    type SVGProps,
} from 'react';

type Place = {
    label: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    /** Where it floats, in pixels from the middle of the vault. */
    x: number;
    y: number;
};

const places: Place[] = [
    { label: 'Keep a repository', icon: GitHub, x: -170, y: -190 },
    { label: 'Keep a star', icon: Star, x: -300, y: -110 },
    { label: 'Keep a pen', icon: Codepen, x: -360, y: -20 },
    { label: 'Keep an image', icon: Picture, x: -250, y: 20 },
    { label: 'Keep a palette', icon: Colors, x: -320, y: 90 },
    { label: 'Keep a bookmark', icon: Bookmark, x: 240, y: -150 },
    { label: 'Keep a browser tab', icon: Chrome, x: 360, y: -80 },
    { label: 'Keep a note', icon: Text, x: 270, y: 0 },
    { label: 'Keep a shot', icon: Dribbble, x: 320, y: 90 },
];

/** How long the smoke plays before the mark sets off for the vault. */
const SMOKE_TIME = 1000;

/** A little different for every icon, but the same on every visit, so nothing shifts when the page loads. */
function wobble(index: number) {
    const odd = index % 2 === 0;

    return {
        '--float-from': `${odd ? -2 : 2}deg`,
        '--float-to': `${odd ? 5 : -4}deg`,
        '--float-x': `${odd ? 3 : -3}px`,
        '--float-scale': index % 3 === 0 ? 1.1 : 1.05,
        '--float-duration': `${2 + (index % 4) * 0.25}s`,
        animationDelay: `-${(index * 0.37) % 2.4}s`,
    } as const;
}

/**
 * A vault, and the places things get lost in floating round it. Press one and it puffs into the Stashlist mark,
 * which flies into the vault and makes it shimmer. The shimmer follows the pointer, too. Every icon is a real
 * button; with reduced motion nothing floats, puffs or flies, the icon is just kept.
 */
export function Hero({ children }: { children: ReactNode }) {
    const stage = useRef<HTMLDivElement>(null);
    const shimmer = useRef<HTMLSpanElement>(null);
    const [kept, setKept] = useState<string[]>([]);
    const [flying, setFlying] = useState<string[]>([]);
    const [running, setRunning] = useState(false);
    const busy = useRef(false);
    const reduced = useReducedMotion();

    /** One pass of light across the vault. */
    function sweep() {
        if (
            matchMedia('(prefers-reduced-motion: reduce)').matches ||
            shimmer.current === null
        ) {
            return;
        }

        busy.current = true;
        shimmer.current
            .animate(
                [
                    { left: '-20%', opacity: 1 },
                    { left: '120%', opacity: 1 },
                ],
                { duration: 650, easing: 'ease-out' },
            )
            .finished.then(
                () => {
                    busy.current = false;
                },
                () => {
                    busy.current = false;
                },
            );
    }

    useEffect(() => {
        setRunning(true);

        const timer = window.setTimeout(sweep, 300);
        let frame = 0;

        function follow(event: PointerEvent) {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const box = stage.current?.getBoundingClientRect();
                const light = shimmer.current;

                if (box === undefined || light === null || busy.current) {
                    return;
                }

                const over =
                    event.clientX > box.left - box.width * 0.25 &&
                    event.clientX < box.right + box.width * 0.25 &&
                    event.clientY > box.top - box.height * 0.25 &&
                    event.clientY < box.bottom + box.height * 0.25;

                light.style.left = `${((event.clientX - box.left) / box.width) * 100 - 20}%`;
                light.style.opacity = over ? '1' : '0';
            });
        }

        window.addEventListener('pointermove', follow);

        return () => {
            clearTimeout(timer);
            cancelAnimationFrame(frame);
            window.removeEventListener('pointermove', follow);
        };
    }, []);

    function poofed(label: string) {
        setKept((list) => [...list, label]);

        if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        // The smoke plays, then the mark flies in (Motion) and the vault answers with a shimmer when it lands.
        window.setTimeout(
            () => setFlying((list) => [...list, label]),
            SMOKE_TIME,
        );
    }

    return (
        <LazyMotion features={domAnimation} strict>
            <div className="relative isolate flex flex-col items-center gap-8 text-center">
                <svg
                    height="0"
                    width="0"
                    aria-hidden="true"
                    className="pointer-events-none absolute"
                >
                    <defs>
                        <clipPath
                            id="vault-clip"
                            clipPathUnits="objectBoundingBox"
                        >
                            <path d="M.07229,0C.04359,0,.02033,.02326,.02033,.05196v.08584H.0113C.00506,.1378,0,.14286,0,.1491v.11217C0,.26751,.00506,.27256,.0113,.27256h.00904v.42097H.0113C.00506,.69353,0,.69859,0,.70483v.11217C0,.82324,.00506,.82829,.0113,.82829h.00904v.08437c0,.0287,.02326,.05196,.05196,.05196h.04692v.02711c0,.00499,.00405,.00904,.00904,.00904H.90319c.00499,0,.00904-.00405,.00904-.00904v-.02711h.03659c.0287,0,.05196-.02326,.05196-.05196V.05196C1.00077,.02326,.97751,0,.94881,0H.07229Z" />
                        </clipPath>
                    </defs>
                </svg>

                <div
                    ref={stage}
                    className="relative grid h-[210px] w-[275px] place-content-center sm:h-[310px] sm:w-[375px]"
                >
                    <div className="relative z-20 hidden size-10 sm:block">
                        {places.map((place, index) => {
                            const gone = flying.includes(place.label);
                            const Icon = place.icon;

                            return (
                                <m.span
                                    key={place.label}
                                    className="absolute top-0 left-0 size-10"
                                    initial={{ x: place.x, y: place.y }}
                                    animate={
                                        gone
                                            ? {
                                                  x: 0,
                                                  y: 0,
                                                  scale: 0,
                                                  opacity: 0,
                                              }
                                            : {
                                                  x: place.x,
                                                  y: place.y,
                                                  scale: 1,
                                                  opacity: 1,
                                              }
                                    }
                                    // Pulls back before it shoots off, like a drawn bow.
                                    transition={{
                                        duration: reduced ? 0 : 0.45,
                                        ease: 'backIn',
                                    }}
                                    onAnimationComplete={() => {
                                        if (gone) {
                                            sweep();
                                        }
                                    }}
                                >
                                    <span
                                        className={cn(
                                            'block size-10',
                                            running && 'animate-float',
                                        )}
                                        style={wobble(index)}
                                    >
                                        <LogoPoof
                                            label={place.label}
                                            onPoof={() => poofed(place.label)}
                                            className="size-10"
                                            poofClassName="size-24"
                                        >
                                            <Icon className="size-10" />
                                        </LogoPoof>
                                    </span>
                                </m.span>
                            );
                        })}
                    </div>

                    <div className="absolute inset-0 h-fit -rotate-6 [clip-path:url(#vault-clip)]">
                        <span
                            ref={shimmer}
                            aria-hidden="true"
                            className="pointer-events-none absolute top-1/2 left-full z-10 h-[200%] w-36 -translate-y-1/2 rotate-[19deg] bg-gradient-to-r from-white/0 via-white/55 to-white/0 opacity-0 transition-opacity duration-300"
                        />
                        <img
                            src="/static/vault.webp"
                            width={760}
                            height={760}
                            alt=""
                            className="w-full"
                        />
                    </div>

                    {/* Fades the vault out at the bottom, and hides what hangs below. */}
                    <div className="absolute bottom-0 left-1/2 z-10 h-[120px] w-screen -translate-x-1/2 bg-gradient-to-t from-background to-background/0" />
                    <div className="absolute top-full left-1/2 z-10 h-1/2 w-screen -translate-x-1/2 bg-background" />
                </div>

                <div className="relative z-10 grid max-w-[60ch] justify-items-center gap-6">
                    {children}
                </div>

                <p aria-live="polite" className="sr-only">
                    {kept.length === 0
                        ? ''
                        : `Kept ${kept.length} of ${places.length}.`}
                </p>
            </div>
        </LazyMotion>
    );
}
