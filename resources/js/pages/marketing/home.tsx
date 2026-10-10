import { Hero } from '@/components/hero';
import { CallToAction } from '@/components/marketing';
import { Seo } from '@/components/seo';
import MarketingLayout from '@/layouts/marketing-layout';
import { docs, login, pricing, register } from '@/routes';
import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

type Props = {
    marketing: App.Data.MarketingData;
};

const features = [
    {
        title: 'Fast',
        text: 'Search answers while you type. What you save is on screen the moment you save it, and fills in behind your back.',
    },
    {
        title: 'Browser extension',
        text: 'One key press saves the page as you see it, even behind a login. Highlight a passage and it is painted again the next time you open the page.',
    },
    {
        title: 'Tags itself',
        text: 'Pages and pictures get a summary and tags, in your own vocabulary. Remove a tag and it stays removed.',
    },
    {
        title: 'Finds by meaning',
        text: '“That article about sourdough starters” finds it without the exact words. Pictures are found by what is in them and by the text on them.',
    },
    {
        title: 'Calm',
        text: 'No feed, no assistant, no sparkles. Smart where it helps, quiet where it does not.',
    },
    {
        title: 'Yours',
        text: 'Export everything in one zip. Delete your account and it is gone. Open source: run it yourself.',
    },
];

export default function Home({ marketing }: Props) {
    const { name } = usePage().props;
    const joinable = marketing.registration !== 'closed';

    return (
        <>
            <Seo
                title="Everything worth keeping"
                description="Links, notes, images and colors in one calm place. Save in one gesture, find it by what you remember. Open source and self-hostable."
                path="/"
            />

            <section className="grid items-center gap-12 pt-12 pb-20 sm:pt-20 lg:grid-cols-2">
                <div className="grid gap-6">
                    <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">
                        A place for everything worth keeping.
                    </h1>
                    <p className="max-w-xl text-lg text-muted-foreground">
                        Links, notes, images, colors. Save one in a gesture,
                        find it again by what you remember.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        {joinable ? (
                            <CallToAction href={register()}>
                                Get started
                            </CallToAction>
                        ) : (
                            <CallToAction href={login()}>Log in</CallToAction>
                        )}
                        <CallToAction href={docs()} variant="outline">
                            Host it yourself
                        </CallToAction>
                    </div>
                </div>

                <Hero />
            </section>

            <section className="grid gap-4 border-t py-16">
                <h2 className="max-w-2xl text-2xl font-medium tracking-tight">
                    Say goodbye to scattered bookmarks!
                </h2>
                <p className="max-w-2xl text-muted-foreground">
                    Bookmarks in the browser. Screenshots on the desktop. Links
                    you sent to yourself. Notes in three apps. You saved it
                    somewhere.
                </p>
            </section>

            <section
                aria-label="What it does"
                className="grid gap-x-10 gap-y-8 border-t py-16 sm:grid-cols-2 lg:grid-cols-3"
            >
                {features.map((feature) => (
                    <div
                        key={feature.title}
                        className="grid content-start gap-2"
                    >
                        <h3 className="font-medium">{feature.title}</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            {feature.text}
                        </p>
                    </div>
                ))}
            </section>

            <section className="grid gap-4 border-t py-16">
                <h2 className="text-2xl font-medium tracking-tight">
                    Four euros a month, or free if you host it.
                </h2>
                <p className="max-w-2xl text-muted-foreground">
                    {name} is open source. Run it on your own machine for
                    nothing, or let us run it for you.{' '}
                    <Link href={pricing()} className="underline">
                        See pricing
                    </Link>
                    .
                </p>
            </section>
        </>
    );
}

Home.layout = (page: ReactNode) => <MarketingLayout>{page}</MarketingLayout>;
