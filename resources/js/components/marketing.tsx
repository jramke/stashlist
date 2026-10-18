import { buttonVariants } from '@/components/ui/button-variants';
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
                buttonVariants({
                    variant: variant === 'solid' ? 'default' : 'outline',
                    size: 'lg',
                }),
                'px-4',
                className,
            )}
        />
    );
}

/** A block of a page with a heading, for the plain text pages. Same size as the text: the weight says it is a heading. */
export function Section({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="grid gap-2">
            <h2 className="font-medium">{title}</h2>
            <div className="grid gap-3 text-muted-foreground">{children}</div>
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
        <header className="grid gap-1 pt-10 sm:pt-16">
            <h1 className="font-medium">{title}</h1>
            {children && <p className="text-muted-foreground">{children}</p>}
        </header>
    );
}

/** A command or a snippet to copy. */
export function Code({ children }: { children: string }) {
    return (
        <pre className="overflow-x-auto rounded-xl border bg-card p-3 text-foreground">
            <code>{children}</code>
        </pre>
    );
}
