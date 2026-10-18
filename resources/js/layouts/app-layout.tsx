import { actions } from '@/commands/actions';
import { useAction, useScope } from '@/commands/hooks';
import { AccountMenu } from '@/components/account-menu';
import AppLogoIcon from '@/components/app-logo-icon';
import { ShortcutSheet } from '@/components/shortcut-sheet';
import { home } from '@/routes';
import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState, type ReactNode } from 'react';

/**
 * The frame of every page for a signed-in user: a logo, a small menu and the page. Nothing else; the box on the
 * feed does the searching, and the keyboard does the rest of the navigating.
 */
export default function AppLayout({ children }: { children?: ReactNode }) {
    const { name } = usePage().props;
    const { component } = usePage();
    const [help, setHelp] = useState(false);
    const onFeed = component === 'stashes/index';

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

    // The keyboard: the actions of the app are bound for as long as the frame is on screen.
    useEffect(() => actions.attach(document), []);
    useScope('page', !onFeed);
    useScope('sheet', help);
    useAction('shortcuts.toggle', () => setHelp((value) => !value));
    useAction('shortcuts.close', () => setHelp(false));

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
