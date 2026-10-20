import { actions } from '@/commands/actions';
import { useAction, useScope } from '@/commands/hooks';
import { AppHeader } from '@/components/app-header';
import { trackInput } from '@/lib/input';
import { typeIntoBox } from '@/lib/keys';
import { router, usePage } from '@inertiajs/react';
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';

// The sheet is for the person who presses ?, so the first visit does not carry it.
const ShortcutSheet = lazy(() =>
    import('@/components/shortcut-sheet').then((module) => ({
        default: module.ShortcutSheet,
    })),
);

/**
 * The frame of every page for a signed-in user: the bar with the logo and the small menu, and the page. Nothing
 * else; the box on the feed is part of the bar there (the feed draws it, see `components/omnibar.tsx`) and does
 * the searching, and the keyboard does the rest of the navigating.
 */
export default function AppLayout({ children }: { children?: ReactNode }) {
    const { component } = usePage();
    const [help, setHelp] = useState(false);
    // Once the sheet has been opened it stays mounted, closed, so that it can slide out.
    const [sheetUsed, setSheetUsed] = useState(false);
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
    useEffect(() => trackInput(), []);

    // Letters typed with nothing to take them go to the box (only the feed has one).
    useEffect(() => {
        document.addEventListener('keydown', typeIntoBox);

        return () => document.removeEventListener('keydown', typeIntoBox);
    }, []);
    useScope('page', !onFeed);
    function showSheet(open: boolean) {
        setHelp(open);

        if (open) {
            setSheetUsed(true);
        }
    }

    useScope('sheet', help);
    useAction('shortcuts.toggle', () => showSheet(!help));
    useAction('shortcuts.close', () => showSheet(false));

    return (
        <div className="min-h-svh bg-background text-foreground">
            <div className="mx-auto max-w-7xl px-4 md:px-6">
                {!onFeed && <AppHeader withName />}

                <main className={onFeed ? 'pb-24' : 'pt-6 pb-24'}>
                    {children}
                </main>
            </div>

            {sheetUsed && (
                <Suspense>
                    <ShortcutSheet
                        open={help}
                        onClose={() => showSheet(false)}
                    />
                </Suspense>
            )}
        </div>
    );
}
