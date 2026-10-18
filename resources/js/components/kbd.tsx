import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** A key cap, for the hints that teach the shortcuts. */
export function Kbd({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <kbd
            className={cn(
                'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-foreground/15 bg-muted px-1 font-sans text-[11px] leading-none text-muted-foreground',
                className,
            )}
        >
            {children}
        </kbd>
    );
}
