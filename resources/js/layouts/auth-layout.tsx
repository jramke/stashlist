import AppLogoIcon from '@/components/app-logo-icon';
import { home, privacy } from '@/routes';
import type { AuthLayoutProps } from '@/types';
import { Link } from '@inertiajs/react';

export default function AuthLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="one-size flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link href={home()} className="font-medium">
                            <AppLogoIcon className="size-9 fill-current text-foreground" />
                            <span className="sr-only">{title}</span>
                        </Link>

                        <div className="space-y-2 text-center">
                            <h1 className="font-medium">{title}</h1>
                            <p className="text-center text-muted-foreground">
                                {description}
                            </p>
                        </div>
                    </div>
                    {children}
                    <p className="text-center text-muted-foreground">
                        <Link href={privacy()} className="underline">
                            Privacy
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
