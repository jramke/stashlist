import { CallToAction, PageHeader } from '@/components/marketing';
import { Seo } from '@/components/seo';
import MarketingLayout from '@/layouts/marketing-layout';
import { docs, register } from '@/routes';
import type { ReactNode } from 'react';

type Props = {
    marketing: App.Data.MarketingData;
};

export default function Pricing({ marketing }: Props) {
    return (
        <>
            <Seo
                title="Pricing"
                description="Hosted for four euros a month or forty a year, everything included. Or host it yourself, free and open source."
                path="/pricing"
            />

            <PageHeader title="Pricing">
                One plan, everything in it. Or run it yourself.
            </PageHeader>

            <div className="breakout grid gap-4 sm:grid-cols-2">
                <section className="grid content-start gap-4 rounded-xl border bg-card p-5">
                    <h2 className="font-medium">Hosted</h2>
                    <p>
                        <span className="font-medium">€4</span>{' '}
                        <span className="text-muted-foreground">
                            a month, or €40 a year
                        </span>
                    </p>
                    <ul className="grid gap-1.5 text-sm text-muted-foreground">
                        <li>Everything on this site, nothing held back</li>
                        <li>Up to 25,000 stashes and 25 GB of files</li>
                        <li>Summaries and tags for 1,000 stashes a month</li>
                        <li>The browser extension, with highlights</li>
                        <li>Export everything, delete everything</li>
                    </ul>
                    {marketing.billing ? (
                        <CallToAction href={register()}>Subscribe</CallToAction>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Hosted plans are not open yet.
                        </p>
                    )}
                </section>

                <section className="grid content-start gap-4 rounded-xl border bg-card p-5">
                    <h2 className="font-medium">Host it yourself</h2>
                    <p>
                        <span className="font-medium">Free</span>{' '}
                        <span className="text-muted-foreground">
                            open source (AGPL-3.0)
                        </span>
                    </p>
                    <ul className="grid gap-1.5 text-sm text-muted-foreground">
                        <li>One Docker Compose file, five minutes</li>
                        <li>No limits on stashes or storage</li>
                        <li>
                            Summaries and tags with your own key, or a local
                            model
                        </li>
                        <li>Your data stays on your machine</li>
                    </ul>
                    <CallToAction href={docs()} variant="outline">
                        Read the docs
                    </CallToAction>
                </section>
            </div>
        </>
    );
}

Pricing.layout = (page: ReactNode) => <MarketingLayout>{page}</MarketingLayout>;
