import AppLogoIcon from '@/components/app-logo-icon';
import { buttonVariants } from '@/components/ui/button-variants';
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

const links = [
    { label: 'Pricing', href: pricing().url },
    { label: 'Extension', href: extension().url },
    { label: 'Docs', href: docs().url },
];

const footer = [
    { label: 'Changelog', href: changelog().url },
    { label: 'Privacy', href: privacy().url },
    { label: 'Terms', href: terms().url },
    { label: 'Imprint', href: imprint().url },
];

/**
 * The frame of the pages anyone may read. One size of type all through, on the content grid: text sits in the
 * middle column, a block asks for `breakout` or `breakout-lg` when it needs more room.
 */
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
        <div className="one-size content-grid min-h-svh grid-rows-[auto_1fr_auto] bg-background text-foreground">
            <header className="sticky top-0 z-40 content-grid full-width bg-background/80 backdrop-blur">
                <div className="breakout flex items-center gap-6 py-3">
                    <Link
                        href={home()}
                        className="flex items-center gap-2 rounded-lg font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                        <AppLogoIcon className="size-5 fill-current" />
                        {name}
                    </Link>

                    <nav
                        aria-label="Pages"
                        className="hidden gap-5 text-muted-foreground sm:flex"
                    >
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="ml-auto flex items-center gap-2">
                        {auth.user ? (
                            <Link
                                href={stashes()}
                                className={buttonVariants({
                                    variant: 'default',
                                    size: 'lg',
                                })}
                            >
                                Open {name}
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className={buttonVariants({
                                        variant: 'ghost',
                                        size: 'lg',
                                    })}
                                >
                                    Log in
                                </Link>
                                {marketing?.registration !== 'closed' && (
                                    <Link
                                        href={register()}
                                        className={buttonVariants({
                                            variant: 'default',
                                            size: 'lg',
                                        })}
                                    >
                                        Get started
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="content-grid full-width content-start gap-y-12 pb-24">
                {children}
            </main>

            <footer className="content-grid full-width text-muted-foreground">
                <div className="breakout flex flex-wrap items-center gap-x-6 gap-y-2 border-t py-6">
                    <span className="flex items-center gap-2 text-foreground">
                        <AppLogoIcon className="size-4 fill-current" />
                        {name}
                    </span>
                    {footer.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                            {item.label}
                        </Link>
                    ))}
                    {marketing?.repository_url && (
                        <a
                            href={marketing.repository_url}
                            className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
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
