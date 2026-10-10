import SocialLoginController from '@/actions/App/Http/Controllers/SocialLoginController';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const labels = {
    github: 'GitHub',
    google: 'Google',
} satisfies Record<App.Enums.SocialProvider, string>;

/**
 * "Continue with ..." buttons for the providers this server has an OAuth app for, above the email form. They
 * are plain links: the browser leaves for the provider, so Inertia has no part in it.
 */
export function SocialLogin({
    providers,
}: {
    providers: App.Enums.SocialProvider[];
}) {
    if (providers.length === 0) {
        return null;
    }

    return (
        <div className="grid gap-6">
            <div className="grid gap-2">
                {providers.map((provider) => (
                    <Button
                        key={provider}
                        variant="outline"
                        nativeButton={false}
                        render={
                            <a
                                href={SocialLoginController.redirect.url(
                                    provider,
                                )}
                            />
                        }
                    >
                        Continue with {labels[provider]}
                    </Button>
                ))}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Separator className="flex-1" />
                or
                <Separator className="flex-1" />
            </div>
        </div>
    );
}
