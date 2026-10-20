import { Kbd } from '@/components/kbd';
import { PageHeader, Section } from '@/components/marketing';
import { Seo } from '@/components/seo';
import { buttonVariants } from '@/components/ui/button-variants';
import MarketingLayout from '@/layouts/marketing-layout';
import type { ReactNode } from 'react';

type Props = {
    marketing: App.Data.MarketingData;
};

function Key({ children }: { children: string }) {
    return <Kbd>{children}</Kbd>;
}

export default function Extension({ marketing }: Props) {
    return (
        <>
            <Seo
                title="Browser extension"
                description="Save the page you are looking at in one gesture, and highlight passages that come back when you revisit. For Chrome and Firefox."
                path="/extension"
            />

            <PageHeader title="Browser extension">
                Save the page you are looking at. Highlight what matters.
            </PageHeader>

            <div className="grid max-w-2xl gap-8">
                <div className="flex flex-wrap gap-3">
                    <a
                        href={marketing.chrome_store_url}
                        rel="noopener"
                        className={buttonVariants({ size: 'lg' })}
                    >
                        Add to Chrome
                    </a>
                    {marketing.firefox_store_url !== '' ? (
                        <a
                            href={marketing.firefox_store_url}
                            rel="noopener"
                            className={buttonVariants({
                                variant: 'outline',
                                size: 'lg',
                            })}
                        >
                            Add to Firefox
                        </a>
                    ) : (
                        <span className="inline-flex h-9 items-center px-2.5 text-muted-foreground">
                            Firefox: soon
                        </span>
                    )}
                </div>

                <Section title="Stash">
                    <p>
                        Press <Key>Alt</Key>+<Key>Shift</Key>+<Key>S</Key> on
                        any page and it is stashed at once with your defaults,
                        or click the button to change the title, tags and
                        collections first. The page is read in your own browser,
                        as you see it, so pages behind a login and pages built
                        with JavaScript work. A tick on the icon says it worked.
                    </p>
                    <p>
                        Right-click for more. <em>Stash link</em> keeps a link
                        and <em>Stash color…</em> picks any color on your
                        screen. <em>Stash image</em> looks at the page around
                        the picture: if it is the page&apos;s own picture, like
                        the photo on a product page, the page is stashed with
                        it, price and all. Any other picture is stashed as a
                        picture, titled by its caption, with a link back to the
                        page it was on.
                    </p>
                </Section>

                <Section title="Highlight">
                    <p>
                        Select text and press <Key>Alt</Key>+<Key>Shift</Key>+
                        <Key>H</Key>, or right-click and choose{' '}
                        <em>Highlight selection</em>. The passage is kept in
                        your stash, the stash links back to it, and if you turn
                        on <em>Show my highlights on pages</em> in the settings,
                        it is painted again whenever you open the page. If the
                        page changed and the text is gone, the highlight stays
                        in your stash and is simply not painted.
                    </p>
                </Section>

                <Section title="Stash what you save">
                    <p>
                        A star on GitHub, a bookmark on X and a saved video on
                        YouTube are stashed too, the moment you press the
                        button. It is on for those three sites from the start
                        and you can turn each one off in the settings. Only the
                        thing you saved is sent, and nothing is sent from a site
                        you turned off.
                    </p>
                </Section>

                <Section title="What it can see">
                    <p>
                        It reads a page only when you ask: a click, the shortcut
                        or the menu. The exceptions are the three sites above,
                        where a script sees the button you press, and showing
                        highlights, which you turn on yourself. Nothing is sent
                        in the background, except a check every half hour for
                        highlights you made elsewhere. The addresses of pages
                        you visit never leave your browser.
                    </p>
                </Section>

                <Section title="Your own server">
                    <p>
                        Open the extension&apos;s settings, type the address of
                        your Stashlist and paste a token from{' '}
                        <em>Settings, API tokens</em>. That works for the hosted
                        service and for one you run yourself.
                    </p>
                </Section>
            </div>
        </>
    );
}

Extension.layout = (page: ReactNode) => (
    <MarketingLayout>{page}</MarketingLayout>
);
