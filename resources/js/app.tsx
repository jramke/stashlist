import { ThemeToggle } from '@/components/theme-toggle';
import { Toaster } from '@/components/ui/sonner';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import { createInertiaApp } from '@inertiajs/react';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        if (name === 'welcome') {
            return null;
        }

        // Signing in is a small centered card; everything else lives in the app frame.
        return name.startsWith('auth/') ? AuthLayout : AppLayout;
    },
    strictMode: true,
    withApp(app) {
        return (
            <>
                {app}
                <ThemeToggle className="fixed bottom-4 left-4 z-50" />
                <Toaster />
            </>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
