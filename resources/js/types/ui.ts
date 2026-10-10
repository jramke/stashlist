import type { ReactNode } from 'react';

export type AuthLayoutProps = {
    children?: ReactNode;
    name?: string;
    title?: string;
    description?: string;
};

/** What an Inertia scroll prop looks like to the page: the items under `data`. */
export type Scroll<T> = { data: T[] };
