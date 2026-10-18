import { Kbd } from '@/components/kbd';
import { setSoundEnabled, useSoundEnabled } from '@/lib/sound';
import { cn } from '@/lib/utils';
import { logout, privacy } from '@/routes';
import { index as collections } from '@/routes/collections';
import { edit as profile } from '@/routes/profile';
import { index as tags } from '@/routes/tags';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

/**
 * The few places that are not the feed, behind the initial of the person. A plain disclosure with arrow keys:
 * a menu this small needs no popup library.
 */
export function AccountMenu({ className }: { className?: string }) {
    const { auth } = usePage().props;
    const sounds = useSoundEnabled();
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const button = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        const outside = (event: PointerEvent) => {
            if (
                event.target instanceof Node &&
                !root.current?.contains(event.target)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener('pointerdown', outside);

        return () => document.removeEventListener('pointerdown', outside);
    }, [open]);

    // Opened from the keyboard, the first item takes the focus.
    useEffect(() => {
        if (open && root.current?.dataset.keyboard === 'true') {
            root.current
                .querySelector<HTMLElement>('[role^=menuitem]')
                ?.focus();
        }
    }, [open]);

    function items(): HTMLElement[] {
        return Array.from(
            root.current?.querySelectorAll<HTMLElement>('[role^=menuitem]') ??
                [],
        );
    }

    function keyDown(event: KeyboardEvent<HTMLDivElement>) {
        const all = items();
        const at = all.findIndex((item) => item === document.activeElement);

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();

            if (root.current !== null) {
                root.current.dataset.keyboard = 'true';
            }

            if (!open) {
                setOpen(true);

                return;
            }

            const step = event.key === 'ArrowDown' ? 1 : -1;
            all[(at + step + all.length) % all.length]?.focus();
        } else if (event.key === 'Escape' && open) {
            event.preventDefault();
            setOpen(false);
            button.current?.focus();
        } else if (event.key === 'Tab') {
            setOpen(false);
        }
    }

    const name = auth.user?.name ?? '';

    return (
        <div
            ref={root}
            className={cn('relative', className)}
            onKeyDown={keyDown}
        >
            <button
                ref={button}
                type="button"
                aria-label="Menu"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={(event) => {
                    if (root.current !== null) {
                        // A click with a pointer reports detail 1 or more; Enter and Space report 0.
                        root.current.dataset.keyboard = String(
                            event.detail === 0,
                        );
                    }

                    setOpen((value) => !value);
                }}
                className="flex size-8 items-center justify-center rounded-full border bg-card text-xs font-medium text-muted-foreground uppercase transition-[transform,color] duration-150 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95"
            >
                {name.slice(0, 1) || '·'}
            </button>

            {open && (
                <div
                    role="menu"
                    aria-label="Menu"
                    onClick={() => setOpen(false)}
                    className="absolute top-full right-0 z-40 mt-2 w-52 origin-top-right animate-panel-in rounded-xl border bg-popover p-1.5 text-sm shadow-lg"
                >
                    <p className="truncate px-2 py-1.5 text-xs text-muted-foreground">
                        {name}
                    </p>
                    <MenuLink href={collections().url} keys={['g', 'c']}>
                        Collections
                    </MenuLink>
                    <MenuLink href={tags().url} keys={['g', 't']}>
                        Tags
                    </MenuLink>
                    <MenuLink href={profile().url} keys={['g', 's']}>
                        Settings
                    </MenuLink>
                    <MenuLink href={privacy().url}>Privacy</MenuLink>
                    <button
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={sounds}
                        onClick={() => setSoundEnabled(!sounds)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:bg-muted"
                    >
                        Sounds
                        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                            {sounds ? 'On' : 'Off'}
                            <Kbd>m</Kbd>
                        </span>
                    </button>
                    <div className="my-1 h-px bg-border" />
                    <Link
                        href={logout()}
                        as="button"
                        role="menuitem"
                        className="flex w-full items-center rounded-lg px-2 py-1.5 text-left text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground"
                    >
                        Log out
                    </Link>
                </div>
            )}
        </div>
    );
}

function MenuLink({
    href,
    keys,
    children,
}: {
    href: string;
    keys?: string[];
    children: string;
}) {
    return (
        <Link
            href={href}
            role="menuitem"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none hover:bg-muted focus-visible:bg-muted"
        >
            {children}
            {keys !== undefined && (
                <span className="ml-auto flex gap-1">
                    {keys.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                    ))}
                </span>
            )}
        </Link>
    );
}
