import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

/** The frame of a page anyone may read, signed in or not: a header with the name, and a reading column. */
export default function PublicLayout({ children }: { children?: ReactNode }) {
    const { name } = usePage().props;

    return (
        <div className="min-h-svh bg-background text-foreground">
            <header className="mx-auto flex max-w-2xl items-center gap-2 p-6">
                <Link
                    href={home()}
                    className="flex items-center gap-2 font-medium"
                >
                    <AppLogoIcon className="size-6 fill-current" />
                    {name}
                </Link>
            </header>

            <main className="mx-auto max-w-2xl px-6 pb-16">{children}</main>
        </div>
    );
}
