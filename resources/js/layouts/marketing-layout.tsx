import AppLogoIcon from '@/components/app-logo-icon';
import {
    changelog,
    docs,
    extension,
    home,
    imprint,
    login,
    pricing,
    privacy,
    register,
    terms,
} from '@/routes';
import { index as stashes } from '@/routes/stashes';
import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

const footer = [
    { label: 'Pricing', href: pricing().url },
    { label: 'Extension', href: extension().url },
    { label: 'Docs', href: docs().url },
    { label: 'Changelog', href: changelog().url },
    { label: 'Privacy', href: privacy().url },
    { label: 'Terms', href: terms().url },
    { label: 'Imprint', href: imprint().url },
];

/** The frame of the pages anyone may read: a header with the way in, the page, and a footer with the small print. */
export default function MarketingLayout({
    children,
}: {
    children?: ReactNode;
}) {
    const { name, auth } = usePage().props;
    const { marketing } = usePage<{
        marketing?: App.Data.MarketingData;
    }>().props;

    return (
        <div className="flex min-h-svh flex-col bg-background text-foreground">
            <header className="mx-auto flex w-full max-w-5xl items-center gap-6 px-6 py-5">
                <Link
                    href={home()}
                    className="flex items-center gap-2 font-medium"
                >
                    <AppLogoIcon className="size-6 fill-current" />
                    {name}
                </Link>

                <nav
                    aria-label="Pages"
                    className="hidden gap-5 text-sm text-muted-foreground sm:flex"
                >
                    <Link href={pricing()} className="hover:text-foreground">
                        Pricing
                    </Link>
                    <Link href={extension()} className="hover:text-foreground">
                        Extension
                    </Link>
                    <Link href={docs()} className="hover:text-foreground">
                        Docs
                    </Link>
                </nav>

                <div className="ml-auto flex items-center gap-4 text-sm">
                    {auth.user ? (
                        <Link href={stashes()} className="font-medium">
                            Open {name}
                        </Link>
                    ) : (
                        <>
                            <Link
                                href={login()}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Log in
                            </Link>
                            {marketing?.registration !== 'closed' && (
                                <Link
                                    href={register()}
                                    className="rounded-lg bg-foreground px-3 py-1.5 font-medium text-background hover:opacity-90"
                                >
                                    Get started
                                </Link>
                            )}
                        </>
                    )}
                </div>
            </header>

            <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-20">
                {children}
            </main>

            <footer className="border-t">
                <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-6 py-6 text-xs text-muted-foreground">
                    <span>{name}</span>
                    {footer.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="hover:text-foreground"
                        >
                            {item.label}
                        </Link>
                    ))}
                    {marketing?.repository_url && (
                        <a
                            href={marketing.repository_url}
                            className="hover:text-foreground"
                            rel="noopener"
                        >
                            Source
                        </a>
                    )}
                </div>
            </footer>
        </div>
    );
}
