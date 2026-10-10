import AppLogoIcon from '@/components/app-logo-icon';
import { cn } from '@/lib/utils';
import { home, logout } from '@/routes';
import { index as collections } from '@/routes/collections';
import { edit as profile } from '@/routes/profile';
import { index as stashes } from '@/routes/stashes';
import { index as tags } from '@/routes/tags';
import { Link, usePage } from '@inertiajs/react';
import { FolderOpen, Layers, Tag, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type NavItem = {
    label: string;
    href: string;
    icon: LucideIcon;
    count?: number;
};

/** The frame of every page for a signed-in user: a sidebar with the collections and a slim header. */
export default function AppLayout({ children }: { children?: ReactNode }) {
    const { name, collections: shared, auth } = usePage().props;
    const currentUrl = usePage().url;

    const library: NavItem[] = [
        { label: 'All stashes', href: stashes().url, icon: Layers },
        {
            label: 'Unsorted',
            href: stashes({ query: { collection: 'none' } }).url,
            icon: FolderOpen,
        },
    ];

    const manage: NavItem[] = [
        { label: 'Tags', href: tags().url, icon: Tag },
        { label: 'Collections', href: collections().url, icon: FolderOpen },
    ];

    return (
        <div className="flex min-h-svh bg-background text-foreground">
            <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r p-4 md:flex">
                <Link
                    href={home()}
                    className="flex items-center gap-2 font-medium"
                >
                    <AppLogoIcon className="size-6 fill-current" />
                    {name}
                </Link>

                <nav aria-label="Library" className="grid gap-1">
                    {library.map((item) => (
                        <NavLink
                            key={item.href}
                            item={item}
                            currentUrl={currentUrl}
                        />
                    ))}
                </nav>

                {shared.length > 0 && (
                    <nav aria-label="Collections" className="grid gap-1">
                        <p className="px-2 text-xs font-medium text-muted-foreground">
                            Collections
                        </p>
                        {shared.map((collection) => (
                            <NavLink
                                key={collection.id}
                                item={{
                                    label: collection.name,
                                    href: stashes({
                                        query: { collection: collection.id },
                                    }).url,
                                    icon: FolderOpen,
                                    count: collection.stashes_count,
                                }}
                                currentUrl={currentUrl}
                            />
                        ))}
                    </nav>
                )}

                <nav aria-label="Manage" className="mt-auto grid gap-1">
                    {manage.map((item) => (
                        <NavLink
                            key={item.href}
                            item={item}
                            currentUrl={currentUrl}
                        />
                    ))}
                </nav>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur">
                    <Link
                        href={home()}
                        className="font-medium md:hidden"
                        aria-label={name}
                    >
                        <AppLogoIcon className="size-6 fill-current" />
                    </Link>
                    <nav
                        aria-label="Sections"
                        className="flex gap-3 overflow-x-auto text-sm md:hidden"
                    >
                        <Link href={stashes()}>Stashes</Link>
                        <Link href={collections()}>Collections</Link>
                        <Link href={tags()}>Tags</Link>
                    </nav>
                    <div className="ml-auto flex items-center gap-4 text-sm">
                        <Link
                            href={profile()}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            {auth.user?.name ?? 'Settings'}
                        </Link>
                        <Link
                            href={logout()}
                            as="button"
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Log out
                        </Link>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-6">{children}</main>
            </div>
        </div>
    );
}

function NavLink({ item, currentUrl }: { item: NavItem; currentUrl: string }) {
    const active = currentUrl === item.href;

    return (
        <Link
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                active && 'bg-muted text-foreground',
            )}
        >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
            {item.count !== undefined && (
                <span className="ml-auto text-xs tabular-nums">
                    {item.count}
                </span>
            )}
        </Link>
    );
}
