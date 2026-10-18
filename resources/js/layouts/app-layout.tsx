import { AccountMenu } from '@/components/account-menu';
import AppLogoIcon from '@/components/app-logo-icon';
import { ShortcutSheet } from '@/components/shortcut-sheet';
import { goBack } from '@/lib/back';
import { focusBox, isTyping } from '@/lib/keys';
import { setSoundEnabled, soundEnabled } from '@/lib/sound';
import { home } from '@/routes';
import { index as collections } from '@/routes/collections';
import { edit as profile } from '@/routes/profile';
import { index as stashes } from '@/routes/stashes';
import { index as tags } from '@/routes/tags';
import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

/** `g` then one of these goes there, the way a mail client does. */
const destinations: Record<string, string> = {
    h: stashes().url,
    c: collections().url,
    t: tags().url,
    s: profile().url,
};

/**
 * The frame of every page for a signed-in user: a logo, a small menu and the page. Nothing else; the box on the
 * feed does the searching, and the keyboard does the rest of the navigating.
 */
export default function AppLayout({ children }: { children?: ReactNode }) {
    const { name } = usePage().props;
    const { component } = usePage();
    const [help, setHelp] = useState(false);
    const onFeed = component === 'stashes/index';
    const keys = useRef({ onFeed, help });

    useEffect(() => {
        keys.current = { onFeed, help };
    });

    // Back from a stash shows the feed as it was left, instantly; then it asks again, because the stash may have
    // been edited, tagged or deleted since.
    useEffect(
        () =>
            router.on('navigate', ({ detail }) => {
                if (
                    detail.type === 'history' &&
                    detail.page.component === 'stashes/index'
                ) {
                    router.reload({
                        only: ['stashes', 'filters', 'tags'],
                        reset: ['stashes'],
                    });
                }
            }),
        [],
    );

    useEffect(() => {
        let waitingForSecondKey = false;
        let timer: number | undefined;

        function keyDown(event: KeyboardEvent) {
            if (event.defaultPrevented) {
                return;
            }

            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();

                if (!focusBox()) {
                    router.visit(stashes().url);
                }

                return;
            }

            if (event.metaKey || event.ctrlKey || event.altKey) {
                return;
            }

            if (isTyping(event.target)) {
                // Escape leaves a field, so the next one can go back.
                if (
                    event.key === 'Escape' &&
                    event.target instanceof HTMLElement
                ) {
                    event.target.blur();
                }

                return;
            }

            if (waitingForSecondKey) {
                waitingForSecondKey = false;
                clearTimeout(timer);
                const destination = destinations[event.key];

                if (destination !== undefined) {
                    event.preventDefault();
                    router.visit(destination);
                }

                return;
            }

            if (event.key === '/') {
                event.preventDefault();

                if (!focusBox()) {
                    router.visit(stashes().url);
                }
            } else if (event.key === 'g') {
                waitingForSecondKey = true;
                timer = window.setTimeout(() => {
                    waitingForSecondKey = false;
                }, 1200);
            } else if (event.key === 'm') {
                const on = !soundEnabled();

                setSoundEnabled(on);
                toast(on ? 'Sounds on' : 'Sounds off', { duration: 1500 });
            } else if (event.key === '?') {
                setHelp((value) => !value);
            } else if (event.key === 'Escape') {
                if (keys.current.help) {
                    setHelp(false);
                } else if (!keys.current.onFeed) {
                    goBack();
                }
            }
        }

        document.addEventListener('keydown', keyDown);

        return () => {
            document.removeEventListener('keydown', keyDown);
            clearTimeout(timer);
        };
    }, []);

    return (
        <div className="min-h-svh bg-background text-foreground">
            <header className="mx-auto flex max-w-7xl items-center px-4 pt-4 pb-2 md:px-6">
                <Link
                    href={home()}
                    className="flex items-center gap-2 rounded-lg font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                    <AppLogoIcon className="size-5 fill-current" />
                    {name}
                </Link>

                <AccountMenu className="ml-auto" />
            </header>

            <main className="mx-auto max-w-7xl px-4 pt-2 pb-24 md:px-6">
                {children}
            </main>

            {help && <ShortcutSheet onClose={() => setHelp(false)} />}
        </div>
    );
}
