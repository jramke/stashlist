import ConnectExtensionController from '@/actions/App/Http/Controllers/ConnectExtensionController';
import { Button } from '@/components/ui/button';
import { Form, Head } from '@inertiajs/react';

type Props = {
    browser: string;
    redirect_uri: string;
    state: string;
};

/** What the browser extension asks for through its sign-in window: a token of its own, made on approval. */
export default function ConnectExtension({
    browser,
    redirect_uri,
    state,
}: Props) {
    return (
        <>
            <Head title="Connect the extension" />

            <div className="mx-auto grid max-w-md gap-6">
                <div className="grid gap-2">
                    <h1 className="text-xl font-medium">
                        Connect the {browser} extension
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        The Stashlist extension in {browser} asks to save to
                        your stashes, look them up and mark highlights on pages.
                        It gets a token of its own, which you can revoke under
                        API tokens at any time. It cannot delete or change a
                        stash.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Form {...ConnectExtensionController.store.form()}>
                        {({ processing }) => (
                            <>
                                <input
                                    type="hidden"
                                    name="redirect_uri"
                                    value={redirect_uri}
                                />
                                <input
                                    type="hidden"
                                    name="state"
                                    value={state}
                                />
                                <Button type="submit" disabled={processing}>
                                    Connect
                                </Button>
                            </>
                        )}
                    </Form>
                    <Form {...ConnectExtensionController.deny.form()}>
                        {({ processing }) => (
                            <>
                                <input
                                    type="hidden"
                                    name="redirect_uri"
                                    value={redirect_uri}
                                />
                                <input
                                    type="hidden"
                                    name="state"
                                    value={state}
                                />
                                <Button
                                    type="submit"
                                    variant="outline"
                                    disabled={processing}
                                >
                                    Cancel
                                </Button>
                            </>
                        )}
                    </Form>
                </div>
            </div>
        </>
    );
}
