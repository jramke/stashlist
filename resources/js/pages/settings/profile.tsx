import AccountController from '@/actions/App/Http/Controllers/Settings/AccountController';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import SmartFeaturesController from '@/actions/App/Http/Controllers/Settings/SmartFeaturesController';
import { ConfirmButton } from '@/components/confirm-button';
import InputError from '@/components/input-error';
import { SettingsFrame } from '@/components/settings-frame';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useAuthUser } from '@/hooks/use-auth-user';
import { Form, Head, router } from '@inertiajs/react';

export default function Profile() {
    const user = useAuthUser();

    return (
        <>
            <Head title="Profile" />

            <SettingsFrame
                title="Profile"
                description="Update your name and email address"
            >
                <Form
                    {...ProfileController.update.form()}
                    options={{ preserveScroll: true }}
                    className="grid gap-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={user.name}
                                    required
                                    autoComplete="name"
                                    placeholder="Full name"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    defaultValue={user.email}
                                    required
                                    autoComplete="username"
                                    placeholder="email@example.com"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <Button
                                disabled={processing}
                                data-test="update-profile-button"
                            >
                                {processing && <Spinner />}
                                Save
                            </Button>
                        </>
                    )}
                </Form>

                <section className="grid gap-3 border-t pt-6">
                    <h2 className="text-sm font-medium">Smart features</h2>

                    <div className="flex items-start gap-2">
                        <Checkbox
                            id="ai-enabled"
                            checked={user.ai_enabled}
                            onCheckedChange={(checked) =>
                                router.patch(
                                    SmartFeaturesController.update.url(),
                                    { ai_enabled: checked },
                                    { preserveScroll: true },
                                )
                            }
                        />
                        <Label htmlFor="ai-enabled" className="grid gap-1">
                            Use AI to tag and summarize what I save
                            <span className="text-xs font-normal text-muted-foreground">
                                Turn it off and nothing you save is sent to an
                                AI provider. Tags and summaries made before
                                stay.
                            </span>
                        </Label>
                    </div>
                </section>

                <section className="grid gap-3 border-t pt-6">
                    <h2 className="text-sm font-medium">Delete account</h2>

                    <p className="text-sm text-muted-foreground">
                        This removes your account and everything in it: your
                        stashes, tags, collections, highlights and files. It
                        cannot be undone. Export your data first if you want a
                        copy. Backups are kept for up to 14 days.
                    </p>

                    <Form
                        {...AccountController.destroy.form()}
                        id="delete-account"
                        className="grid gap-3"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="confirmation">
                                        {user.has_password
                                            ? 'Your password'
                                            : 'Type your email address'}
                                    </Label>
                                    <Input
                                        id="confirmation"
                                        name="confirmation"
                                        type={
                                            user.has_password
                                                ? 'password'
                                                : 'email'
                                        }
                                        autoComplete="off"
                                        required
                                    />
                                    <InputError message={errors.confirmation} />
                                </div>

                                <ConfirmButton
                                    variant="destructive"
                                    className="w-fit"
                                    disabled={processing}
                                    confirmLabel="Everything goes. Delete?"
                                    onConfirm={() => {
                                        const form =
                                            document.getElementById(
                                                'delete-account',
                                            );

                                        if (form instanceof HTMLFormElement) {
                                            form.requestSubmit();
                                        }
                                    }}
                                >
                                    {processing && <Spinner />}
                                    Delete my account
                                </ConfirmButton>
                            </>
                        )}
                    </Form>
                </section>
            </SettingsFrame>
        </>
    );
}
