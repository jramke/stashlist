import { cn } from '@/lib/utils';
import { index as exports } from '@/routes/exports';
import { edit as profile } from '@/routes/profile';
import { index as tokens } from '@/routes/tokens';
import { show as usage } from '@/routes/usage';
import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

const sections = [
    { label: 'Profile', href: profile().url },
    { label: 'Usage', href: usage().url },
    { label: 'Export', href: exports().url },
    { label: 'API tokens', href: tokens().url },
];

/** The frame of an account settings page: a small navigation between the sections, then a heading. */
export function SettingsFrame({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    const currentUrl = usePage().url;

    return (
        <div className="mx-auto grid max-w-2xl gap-8">
            <nav aria-label="Settings" className="flex gap-4 text-sm">
                {sections.map((section) => (
                    <Link
                        key={section.href}
                        href={section.href}
                        aria-current={
                            currentUrl === section.href ? 'page' : undefined
                        }
                        className={cn(
                            'text-muted-foreground hover:text-foreground',
                            currentUrl === section.href &&
                                'font-medium text-foreground',
                        )}
                    >
                        {section.label}
                    </Link>
                ))}
            </nav>

            <header className="grid gap-1">
                <h1 className="text-2xl font-medium">{title}</h1>
                <p className="text-sm text-muted-foreground">{description}</p>
            </header>

            {children}
        </div>
    );
}
