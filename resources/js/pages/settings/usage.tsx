import { SettingsFrame } from '@/components/settings-frame';
import { Head } from '@inertiajs/react';

type Props = {
    usage: App.Support.Usage;
};

const plans: Record<string, string> = {
    free: 'Free',
    flat: 'Flat',
    unlimited: 'Unlimited',
};

function megabytes(bytes: number): string {
    return bytes >= 1024 ** 3
        ? `${(bytes / 1024 ** 3).toFixed(1)} GB`
        : `${Math.round(bytes / 1024 ** 2)} MB`;
}

/** One line of the page: what is used, against the cap when there is one. */
function Meter({
    label,
    used,
    cap,
    show = (value: number) => value.toLocaleString(),
}: {
    label: string;
    used: number;
    cap: number | null;
    show?: (value: number) => string;
}) {
    const share = cap === null || cap === 0 ? 0 : Math.min(1, used / cap);

    return (
        <div className="grid gap-1.5">
            <div className="flex items-baseline justify-between text-sm">
                <span>{label}</span>
                <span className="text-muted-foreground">
                    {show(used)}
                    {cap === null ? '' : ` of ${show(cap)}`}
                </span>
            </div>
            {cap !== null && (
                <div
                    role="progressbar"
                    aria-label={label}
                    aria-valuemin={0}
                    aria-valuemax={cap}
                    aria-valuenow={used}
                    className="h-2 overflow-hidden rounded-full bg-muted"
                >
                    <div
                        className="h-full rounded-full bg-foreground"
                        style={{ width: `${Math.round(share * 100)}%` }}
                    />
                </div>
            )}
        </div>
    );
}

export default function Usage({ usage }: Props) {
    return (
        <>
            <Head title="Usage" />

            <SettingsFrame
                title="Usage"
                description={`You are on the ${plans[usage.plan] ?? usage.plan} plan. These are the limits of it and how much of them you have used.`}
            >
                <div className="grid gap-6">
                    <Meter
                        label="Stashes"
                        used={usage.stashes}
                        cap={usage.stashes_cap}
                    />
                    <Meter
                        label="Storage"
                        used={usage.storage_bytes}
                        cap={usage.storage_cap_bytes}
                        show={megabytes}
                    />
                    <Meter
                        label={`Summaries and tags this month (${usage.period})`}
                        used={usage.ai_stashes}
                        cap={usage.ai_stashes_cap}
                    />
                </div>
            </SettingsFrame>
        </>
    );
}
