import AppLogoIcon from '@/components/app-logo-icon';
import { Hero } from '@/components/hero';
import { LogoPoof } from '@/components/logo-poof';
import { Chrome, Codepen, Dribbble, GitHub, Star } from '@/components/logos';
import { CallToAction } from '@/components/marketing';
import { ProductPreview } from '@/components/product-preview';
import { Seo } from '@/components/seo';
import MarketingLayout from '@/layouts/marketing-layout';
import { docs, login, pricing, register } from '@/routes';
import { usePage } from '@inertiajs/react';
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
        title: 'Keyboard first',
        text: 'Search, stash, filter and move around without the mouse. Press ? for every shortcut.',
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
        title: 'Yours',
        text: 'Export everything in one zip. Delete your account and it is gone. Open source: run it yourself.',
    },
];

/** A logo in a sentence that turns into ours when it is pressed. */
function Inline({ label, children }: { label: string; children: ReactNode }) {
    return (
        <span className="whitespace-nowrap">
            <LogoPoof label={label} className="-mt-1 mr-1 size-5">
                {children}
            </LogoPoof>
        </span>
    );
}

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

            <section className="full-width overflow-hidden px-(--content-grid-padding) pt-20 sm:pt-24">
                <Hero>
                    <div className="grid gap-1">
                        <h1 className="font-medium">
                            A place for everything worth keeping.
                        </h1>
                        <p className="text-muted-foreground">
                            Links, notes, images, colors. Save one in a gesture,
                            find it again by what you remember.
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
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
                </Hero>
            </section>

            <ProductPreview className="breakout-lg" />

            <section className="grid gap-6">
                <h2 className="font-medium">
                    Say goodbye to scattered bookmarks!
                </h2>
                <p>
                    Starting something new and you cannot find that useful link
                    you saved?
                </p>
                <p className="text-muted-foreground">
                    Your{' '}
                    <Inline label="Turn the browser bookmarks into Stashlist">
                        <Chrome className="size-5" />
                    </Inline>
                    browser bookmarks are scattered like confetti. Your liked{' '}
                    <Inline label="Turn the pens into Stashlist">
                        <Codepen className="size-5 text-foreground" />
                    </Inline>
                    CodePens and{' '}
                    <Inline label="Turn the shots into Stashlist">
                        <Dribbble className="size-5" />
                    </Inline>
                    Dribbble shots are lost in the mix. And let us not even
                    think about diving into your{' '}
                    <Inline label="Turn the stars into Stashlist">
                        <span className="relative inline-block size-5">
                            <GitHub className="size-5 text-foreground" />
                            <Star className="absolute -top-1 -right-1.5 size-3 rotate-[5deg]" />
                        </span>
                    </Inline>
                    GitHub stars, looking for that library.
                </p>
                <p>But what if there was a better way?</p>
                <p className="font-medium">
                    Introducing{' '}
                    <AppLogoIcon className="mx-0.5 -mt-1 inline size-5 fill-current" />{' '}
                    {name}: a place for everything worth keeping.
                </p>
            </section>

            <section
                aria-label="What it does"
                className="breakout grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
                {features.map((feature) => (
                    <div
                        key={feature.title}
                        className="grid content-start gap-1.5 rounded-xl border bg-card p-4 transition-[border-color,box-shadow] duration-150 [@media(hover:hover)]:hover:border-foreground/25 [@media(hover:hover)]:hover:shadow-sm"
                    >
                        <h3 className="font-medium">{feature.title}</h3>
                        <p className="text-muted-foreground">{feature.text}</p>
                    </div>
                ))}
            </section>

            <section className="grid justify-items-start gap-4">
                <h2 className="font-medium">
                    Four euros a month, or free if you host it.
                </h2>
                <p className="text-muted-foreground">
                    {name} is open source. Run it on your own machine for
                    nothing, or let us run it for you. Go ahead, give it a try.
                </p>
                <div className="flex flex-wrap gap-3">
                    {joinable ? (
                        <CallToAction href={register()}>
                            Get started
                        </CallToAction>
                    ) : (
                        <CallToAction href={login()}>Log in</CallToAction>
                    )}
                    <CallToAction href={pricing()} variant="outline">
                        See pricing
                    </CallToAction>
                </div>
            </section>
        </>
    );
}

Home.layout = (page: ReactNode) => <MarketingLayout>{page}</MarketingLayout>;
