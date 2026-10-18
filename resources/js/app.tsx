import { Toaster } from '@/components/ui/sonner';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import { createInertiaApp } from '@inertiajs/react';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        // The pages anyone may read set their own frame (layouts/marketing-layout), so it stays out of the app's
        // first download; signing in is a small centered card; everything else lives in the app frame.
        if (name.startsWith('marketing/')) {
            return null;
        }

        return name.startsWith('auth/') ? AuthLayout : AppLayout;
    },
    strictMode: true,
    withApp(app) {
        return (
            <>
                {app}
                <Toaster />
            </>
        );
    },
    progress: {
        color: '#a3a3a3',
    },
});
