import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Form, Head, usePage } from '@inertiajs/react';

export default function Profile() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Profile" />

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
                                defaultValue={auth.user.name}
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
                                defaultValue={auth.user.email}
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
        </>
    );
}

Profile.layout = {
    title: 'Profile',
    description: 'Update your name and email address',
};
