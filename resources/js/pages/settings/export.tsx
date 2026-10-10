import ExportController from '@/actions/App/Http/Controllers/Settings/ExportController';
import { SettingsFrame } from '@/components/settings-frame';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { download } from '@/routes/exports';
import { Form, Head, usePoll } from '@inertiajs/react';
import { Download } from 'lucide-react';
import { useEffect } from 'react';

type Props = {
    exports: App.Data.ExportData[];
};

/** How often the page asks again while an export is being made. */
const POLL_INTERVAL = 3000;

function size(bytes: number | null): string {
    if (bytes === null) {
        return '';
    }

    return bytes >= 1024 ** 3
        ? `${(bytes / 1024 ** 3).toFixed(1)} GB`
        : `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`;
}

export default function Export({ exports }: Props) {
    const making = exports.some(
        (item) => item.status === 'queued' || item.status === 'running',
    );
    const { start, stop } = usePoll(
        POLL_INTERVAL,
        { only: ['exports'] },
        { autoStart: false },
    );

    useEffect(() => {
        if (making) {
            start();
        } else {
            stop();
        }
    }, [making, start, stop]);

    return (
        <>
            <Head title="Export" />

            <SettingsFrame
                title="Export"
                description="Download everything you have in Stashlist as one zip: a JSON file with your stashes, tags, collections, highlights, summaries and page text, and the files you saved. The download stays for a week."
            >
                <Form
                    {...ExportController.store.form()}
                    options={{ preserveScroll: true }}
                >
                    {({ processing }) => (
                        <Button type="submit" disabled={processing || making}>
                            {(processing || making) && <Spinner />}
                            Export my data
                        </Button>
                    )}
                </Form>

                {exports.length > 0 && (
                    <ul className="grid gap-2">
                        {exports.map((item) => (
                            <li
                                key={item.id}
                                className="flex items-center gap-3 rounded-xl border p-3 text-sm"
                            >
                                <span className="flex-1">
                                    {new Date(item.created_at).toLocaleString()}
                                    <span className="block text-xs text-muted-foreground">
                                        {item.status === 'ready' &&
                                            !item.downloadable &&
                                            'Expired'}
                                        {item.status === 'ready' &&
                                            item.downloadable &&
                                            `${item.stash_count ?? 0} stashes, ${size(item.bytes)}`}
                                        {(item.status === 'queued' ||
                                            item.status === 'running') &&
                                            'Being made…'}
                                        {item.status === 'failed' &&
                                            'It could not be made. Try again.'}
                                    </span>
                                </span>

                                {item.downloadable && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        render={
                                            <a href={download(item.id).url} />
                                        }
                                        nativeButton={false}
                                    >
                                        <Download />
                                        Download
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </SettingsFrame>
        </>
    );
}
