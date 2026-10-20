import { AccountMenu } from '@/components/account-menu';
import { AppLogoMark } from '@/components/app-logo-mark';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

/**
 * The bar at the top of every page of the app: the mark on the left, the account menu on the right and a line
 * under all of it. The middle is the page's: the name of the app, or on the feed the box itself. Every part is
 * 2.75rem tall, so the mark and the menu stay where they are when the box grows a line.
 */
export function AppHeader({
    children,
    badge,
    withName,
    className,
}: {
    children?: ReactNode;
    /** Something small on the mark: the box shows there what it would stash. */
    badge?: ReactNode;
    /** The name of the app next to the mark, for pages that have no box. */
    withName?: boolean;
    className?: string;
}) {
    const { name } = usePage().props;

    return (
        <header
            className={cn(
                'flex items-start gap-3 border-b bg-background pt-3 transition-colors duration-150',
                className,
            )}
        >
            <Link
                href={home()}
                aria-label={withName ? undefined : name}
                className="flex h-11 shrink-0 items-center gap-2 rounded-lg font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
                <span className="relative flex">
                    <AppLogoMark className="size-6" />
                    {badge}
                </span>
                {withName && name}
            </Link>

            {/* Before the middle in the markup, so Tab goes from the box to the cards and not through the menu; it is last on the screen. */}
            <div className="order-last ml-auto flex h-11 shrink-0 items-center">
                <AccountMenu />
            </div>

            {children}
        </header>
    );
}
