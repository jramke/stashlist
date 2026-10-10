import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import type { ComponentProps, ReactNode } from 'react';

/** A big call to action: a link that looks like a button, filled or outlined. */
export function CallToAction({
    variant = 'solid',
    className,
    ...props
}: ComponentProps<typeof Link> & { variant?: 'solid' | 'outline' }) {
    return (
        <Link
            {...props}
            className={cn(
                'inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-medium transition-opacity',
                variant === 'solid'
                    ? 'bg-foreground text-background hover:opacity-90'
                    : 'border hover:bg-muted',
                className,
            )}
        />
    );
}

/** A block of a page with a heading, for the plain text pages. */
export function Section({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="grid gap-2">
            <h2 className="text-lg font-medium">{title}</h2>
            <div className="grid gap-2 text-sm leading-relaxed text-muted-foreground">
                {children}
            </div>
        </section>
    );
}

/** The top of a plain text page. */
export function PageHeader({
    title,
    children,
}: {
    title: string;
    children?: ReactNode;
}) {
    return (
        <header className="grid max-w-2xl gap-2 pt-8 pb-10">
            <h1 className="text-3xl font-medium tracking-tight">{title}</h1>
            {children && <p className="text-muted-foreground">{children}</p>}
        </header>
    );
}

/** A command or a snippet to copy. */
export function Code({ children }: { children: string }) {
    return (
        <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed text-foreground">
            <code>{children}</code>
        </pre>
    );
}
