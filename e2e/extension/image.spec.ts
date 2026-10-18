import { BASE_URL, drainQueue } from '../support';
import { expect, test } from './fixture';
import { connect, openPage, serveSite, useMenu, type Color } from './helpers';

const SHOP = 'hearth.example';
const SHOP_CDN = `https://cdn.${SHOP}`;

const PARAGRAPHS = `
    <p>A heavy, pre-seasoned skillet that goes from stovetop to oven to table. The thick walls hold heat evenly, so a steak gets a deep crust and cornbread comes out golden at the edges.</p>
    <p>Wash it by hand with warm water, dry it on the stove and rub in a few drops of oil. With that small habit the seasoning gets better with every meal instead of wearing off.</p>
    <p>Works on gas, electric, induction and open fire, and it will outlive the kitchen it was bought for.</p>`;

/** A product page: one big photo in the main part, small ones beside it, and a page that says what it costs. */
function productPage(socialImage: string): string {
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Cast iron skillet 26 cm | Hearth &amp; Home</title>
<meta property="og:title" content="Cast iron skillet 26 cm">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Hearth &amp; Home">
<meta property="og:image" content="${socialImage}">
<meta name="description" content="Pre-seasoned, oven safe, made to last a lifetime.">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Cast iron skillet 26 cm","offers":{"@type":"Offer","price":"39.90","priceCurrency":"EUR"}}</script>
<style>body{margin:0;font:16px sans-serif} img{display:block} #photo{width:600px;height:600px} .thumb{width:80px;height:80px}</style>
</head><body>
<header><a href="/"><img src="${SHOP_CDN}/logo.png" alt="Hearth" width="120" height="40"></a></header>
<main>
    <h1>Cast iron skillet 26 cm</h1>
    <img id="photo" alt="The skillet from above" src="${SHOP_CDN}/skillet.png?width=533"
         srcset="${SHOP_CDN}/skillet.png?width=533 533w, ${SHOP_CDN}/skillet.png?width=1066 1066w" sizes="600px">
    <img class="thumb" alt="Side view" src="${SHOP_CDN}/pan-side.png">
    ${PARAGRAPHS}
</main></body></html>`;
}

/** A shop window: the same photo as a teaser that leads to the product page. */
function listingPage(): string {
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Hearth &amp; Home</title>
<meta property="og:image" content="${SHOP_CDN}/social-card.png">
<style>body{margin:0;font:16px sans-serif} img{display:block} #photo{width:600px;height:600px}</style>
</head><body><main>
    <h1>New in the kitchen</h1>
    <a href="/skillet"><img id="photo" alt="Cast iron skillet" src="${SHOP_CDN}/skillet.png?width=533"></a>
    ${PARAGRAPHS}
</main></body></html>`;
}

const SHOP_PICTURES: Record<string, Color> = {
    '/skillet.png': 'red',
    '/social-card.png': 'blue',
    '/pan-side.png': 'green',
    '/logo.png': 'green',
};

/** The feed filtered by the color of its pictures, once the page is alive. */
async function cardsOfColor(
    web: import('@playwright/test').Page,
    color: Color,
) {
    await web.goto(`${BASE_URL}/stashes?color=${color}`);
    await expect(web.getByRole('combobox')).toBeVisible();

    return web.locator('[data-card]');
}

test('right-clicking the photo of a product stashes the product, with that photo as its picture', async ({
    extension,
}) => {
    const { web } = await connect(extension);
    await serveSite(extension, SHOP, {
        // The page names the photo itself, in a bigger size.
        pages: {
            '/skillet': productPage(`${SHOP_CDN}/skillet.png?width=1200`),
        },
        pictures: SHOP_PICTURES,
    });
    const { tabId } = await openPage(extension, `https://${SHOP}/skillet`);

    const said = await useMenu(extension, tabId, {
        menuItemId: 'stash-image',
        srcUrl: `${SHOP_CDN}/skillet.png?width=533`,
    });

    expect(said).toMatch(/^Stashed: Cast iron skillet/);

    drainQueue();
    await web.goto(`${BASE_URL}/stashes`);

    // One stash, and it is the page: a product with its price, not a loose picture.
    await expect(web.locator('[data-card]')).toHaveCount(1);
    await expect(web.locator('[data-card][data-type="link"]')).toHaveCount(1);
    await expect(web.getByText('€39.90', { exact: true })).toBeVisible();

    await expect(await cardsOfColor(web, 'red')).toHaveCount(1);
    await expect(await cardsOfColor(web, 'blue')).toHaveCount(0);
});

test('the biggest photo stands for its page even when the page names another picture', async ({
    extension,
}) => {
    const { web } = await connect(extension);
    await serveSite(extension, SHOP, {
        // The page's own social card is blue and nothing on the page shows it.
        pages: { '/skillet': productPage(`${SHOP_CDN}/social-card.png`) },
        pictures: SHOP_PICTURES,
    });
    const { tabId } = await openPage(extension, `https://${SHOP}/skillet`);

    const said = await useMenu(extension, tabId, {
        menuItemId: 'stash-image',
        srcUrl: `${SHOP_CDN}/skillet.png?width=533`,
    });

    expect(said).toMatch(/^Stashed: /);

    drainQueue();
    await web.goto(`${BASE_URL}/stashes`);
    await expect(web.locator('[data-card][data-type="link"]')).toHaveCount(1);
    await expect(web.getByText('€39.90', { exact: true })).toBeVisible();

    // The picture the person pointed at, not the one the page names.
    await expect(await cardsOfColor(web, 'red')).toHaveCount(1);
    await expect(await cardsOfColor(web, 'blue')).toHaveCount(0);
});

test('a picture that leads to another page is stashed as a picture, with that page as its source', async ({
    extension,
}) => {
    const { web } = await connect(extension);
    await serveSite(extension, SHOP, {
        pages: { '/': listingPage() },
        pictures: SHOP_PICTURES,
    });
    const { tabId } = await openPage(extension, `https://${SHOP}/`);

    const said = await useMenu(extension, tabId, {
        menuItemId: 'stash-image',
        srcUrl: `${SHOP_CDN}/skillet.png?width=533`,
    });

    expect(said).toBe('Stashed image: Cast iron skillet');

    drainQueue();
    await web.goto(`${BASE_URL}/stashes`);

    const card = web.locator('[data-card][data-type="image"]');
    await expect(card).toHaveCount(1);
    await expect(web.locator('[data-card][data-type="link"]')).toHaveCount(0);

    await card.click();
    await expect(
        web.getByRole('link', { name: /From hearth\.example/ }),
    ).toHaveAttribute('href', `https://${SHOP}/skillet`);
});

test('a photo among equals is stashed as a picture, titled by its caption, from the page it was on', async ({
    extension,
}) => {
    const { web } = await connect(extension);
    const host = 'garden.example';
    const cdn = `https://cdn.${host}`;
    await serveSite(extension, host, {
        pages: {
            '/notes': `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Garden notes</title>
<style>body{margin:0;font:16px sans-serif} img{display:block;width:400px;height:300px}</style>
</head><body><main>
    <h1>Garden notes</h1>
    ${PARAGRAPHS}
    <figure><img alt="" src="${cdn}/tomatoes.png"><figcaption>Tomatoes ripening in July</figcaption></figure>
    <figure><img alt="" src="${cdn}/beans.png"><figcaption>Runner beans on the fence</figcaption></figure>
</main></body></html>`,
        },
        pictures: { '/tomatoes.png': 'red', '/beans.png': 'green' },
    });
    const { tabId } = await openPage(extension, `https://${host}/notes`);

    const said = await useMenu(extension, tabId, {
        menuItemId: 'stash-image',
        srcUrl: `${cdn}/beans.png`,
    });

    expect(said).toBe('Stashed image: Runner beans on the fence');

    drainQueue();
    await web.goto(`${BASE_URL}/stashes`);

    // The page itself was not stashed.
    await expect(web.locator('[data-card]')).toHaveCount(1);
    await expect(web.locator('[data-card][data-type="image"]')).toHaveCount(1);
    await expect(await cardsOfColor(web, 'green')).toHaveCount(1);

    await web.locator('[data-card]').click();
    await expect(
        web.getByRole('link', { name: /From garden\.example/ }),
    ).toHaveAttribute('href', `https://${host}/notes`);
});
