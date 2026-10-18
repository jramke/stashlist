import AppLogoIcon from '@/components/app-logo-icon';
import { loadPoof, warmPoof } from '@/lib/poof';
import { cn } from '@/lib/utils';
import type { Rive } from '@rive-app/canvas-lite';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Eight bits of smoke for when the animation cannot be loaded. */
const PUFFS = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2 + (i % 2) * 0.3;
    const reach = 18 + (i % 3) * 6;

    return {
        x: Math.round(Math.cos(angle) * reach),
        y: Math.round(Math.sin(angle) * reach),
        size: 8 + (i % 3) * 3,
    };
});

/**
 * A thing from somewhere else (a bookmark, a pen, a star) that turns into the Stashlist mark in a puff of smoke
 * when it is pressed. `children` is the thing; `onPoof` tells the parent, which may send the mark on its way.
 * The smoke is the Rive animation of the old site; without it (it failed to load) the logo puffs with CSS.
 */
export function LogoPoof({
    children,
    label,
    onPoof,
    className,
    markClassName,
    poofClassName,
}: {
    children: ReactNode;
    label: string;
    onPoof?: () => void;
    className?: string;
    markClassName?: string;
    /** The size of the smoke, which is bigger than the thing it comes from. */
    poofClassName?: string;
}) {
    const [poofed, setPoofed] = useState(false);
    const [smoke, setSmoke] = useState<'waiting' | 'rive' | 'css' | 'done'>(
        'waiting',
    );
    const canvas = useRef<HTMLCanvasElement>(null);

    // The runtime is big: it loads once a moment after the page, or sooner if a hand comes near.
    useEffect(() => {
        const timer = window.setTimeout(warmPoof, 1500);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!poofed) {
            return;
        }

        if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setSmoke('done');

            return;
        }

        let cancelled = false;
        let rive: Rive | undefined;

        void loadPoof().then((poof) => {
            if (cancelled) {
                return;
            }

            if (poof === null || canvas.current === null) {
                setSmoke('css');

                return;
            }

            rive = new poof.Rive({
                buffer: poof.buffer,
                canvas: canvas.current,
                autoplay: false,
                onLoad: () => {
                    rive?.resizeDrawingSurfaceToCanvas();
                    setSmoke('rive');
                    rive?.play();
                },
                onLoadError: () => setSmoke('css'),
                onStop: () => setSmoke('done'),
            });
        });

        return () => {
            cancelled = true;
            rive?.cleanup();
        };
    }, [poofed]);

    return (
        <span
            className={cn(
                'relative inline-flex items-center justify-center align-middle',
                className,
            )}
        >
            {poofed ? (
                <>
                    <AppLogoIcon
                        aria-hidden="true"
                        className={cn(
                            'size-full animate-logo-in fill-current',
                            markClassName,
                        )}
                    />
                    <canvas
                        ref={canvas}
                        aria-hidden="true"
                        className={cn(
                            'pointer-events-none absolute top-1/2 left-1/2 z-50 size-16 -translate-x-1/2 -translate-y-1/2',
                            // Hidden but still laid out: Rive measures the canvas to size its drawing surface, and `display: none` measures 0.
                            smoke !== 'rive' && 'invisible',
                            poofClassName,
                        )}
                    />
                    {smoke === 'css' &&
                        PUFFS.map((puff, index) => (
                            <span
                                key={index}
                                aria-hidden="true"
                                className="pointer-events-none absolute top-1/2 left-1/2 animate-puff rounded-full bg-foreground/25"
                                style={{
                                    width: puff.size,
                                    height: puff.size,
                                    ['--puff-x' as string]: `${puff.x}px`,
                                    ['--puff-y' as string]: `${puff.y}px`,
                                }}
                            />
                        ))}
                </>
            ) : (
                <button
                    type="button"
                    aria-label={label}
                    onPointerEnter={warmPoof}
                    onFocus={warmPoof}
                    onClick={() => {
                        setPoofed(true);
                        onPoof?.();
                    }}
                    className="inline-flex size-full cursor-pointer items-center justify-center rounded-md transition-transform duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-90 [@media(hover:hover)]:hover:scale-110"
                >
                    {children}
                </button>
            )}
        </span>
    );
}
