import TokenController from '@/actions/App/Http/Controllers/Settings/TokenController';
import InputError from '@/components/input-error';
import { SettingsFrame } from '@/components/settings-frame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Form, Head, router, usePage } from '@inertiajs/react';
import { Check, Copy, Trash2 } from 'lucide-react';
import { useState } from 'react';

type Props = {
    tokens: App.Data.TokenData[];
};

export default function Tokens({ tokens }: Props) {
    const newToken = usePage().flash.new_token;

    return (
        <>
            <Head title="API tokens" />

            <SettingsFrame
                title="API tokens"
                description="A token lets the browser extension or another app save to your stashes. Make one per app, so you can revoke it alone."
            >
                {newToken && (
                    <NewToken name={newToken.name} token={newToken.token} />
                )}

                <Form
                    {...TokenController.store.form()}
                    resetOnSuccess
                    options={{ preserveScroll: true }}
                    className="grid gap-2"
                >
                    {({ processing, errors }) => (
                        <>
                            <Label htmlFor="token-name">Name of the app</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="token-name"
                                    name="name"
                                    placeholder="Chrome on my MacBook"
                                    maxLength={100}
                                    required
                                    autoComplete="off"
                                />
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Create token
                                </Button>
                            </div>
                            <InputError message={errors.name} />
                            <p className="text-xs text-muted-foreground">
                                A token may save, look up and search stashes and
                                manage the highlights on them. It cannot delete
                                or change a stash.
                            </p>
                        </>
                    )}
                </Form>

                {tokens.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No tokens yet.
                    </p>
                ) : (
                    <ul className="grid gap-2">
                        {tokens.map((token) => (
                            <li
                                key={token.id}
                                className="flex items-center gap-3 rounded-xl border p-3"
                            >
                                <div className="grid flex-1 gap-0.5">
                                    <span className="text-sm font-medium">
                                        {token.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {token.last_used_at === null
                                            ? 'Never used'
                                            : `Last used ${new Date(token.last_used_at).toLocaleString()}`}
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    aria-label={`Revoke ${token.name}`}
                                    onClick={() => {
                                        if (
                                            confirm(
                                                `Revoke "${token.name}"? Apps using it stop working.`,
                                            )
                                        ) {
                                            router.delete(
                                                TokenController.destroy.url(
                                                    token.id,
                                                ),
                                                { preserveScroll: true },
                                            );
                                        }
                                    }}
                                >
                                    <Trash2 />
                                    Revoke
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </SettingsFrame>
        </>
    );
}

/** The one time the secret is shown: copy it now. */
function NewToken({ name, token }: { name: string; token: string }) {
    const [copied, setCopied] = useState(false);

    return (
        <div
            role="status"
            className="grid gap-2 rounded-xl border border-foreground/30 bg-muted p-4"
        >
            <p className="text-sm font-medium">
                Your token for "{name}". Copy it now: it is not shown again.
            </p>
            <div className="flex gap-2">
                <Input
                    readOnly
                    value={token}
                    aria-label="Your new token"
                    onFocus={(event) => event.currentTarget.select()}
                    className="font-mono"
                />
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        void navigator.clipboard
                            .writeText(token)
                            .then(() => setCopied(true));
                    }}
                >
                    {copied ? <Check /> : <Copy />}
                    {copied ? 'Copied' : 'Copy'}
                </Button>
            </div>
        </div>
    );
}
