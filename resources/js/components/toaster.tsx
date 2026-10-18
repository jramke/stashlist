import { useFlashToast } from '@/hooks/use-flash-toast';
import { lazy, Suspense } from 'react';

const Sonner = lazy(() =>
    import('@/components/ui/sonner').then((module) => ({
        default: module.Toaster,
    })),
);

/** The toaster, loaded after the page: the fallback for notes no page shows in place, and a few short answers. */
export function Toaster() {
    useFlashToast();

    return (
        <Suspense fallback={null}>
            <Sonner />
        </Suspense>
    );
}
