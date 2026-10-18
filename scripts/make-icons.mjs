// Makes the raster icons of the app from public/favicon.svg, the one source of the icon: the favicon in three
// sizes (png, ico), the icons of the installed app, the touch icon and the picture shown when a link to the app
// is shared. Needs the Chrome that the browser flows use (it draws the SVG with its filters):
//   node scripts/make-icons.mjs
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const svg = readFileSync('public/favicon.svg', 'utf8');

// The same icon filling the whole square (a platform makes its own corners) with the mark a little smaller, so it
// stays inside what a round or rounded mask leaves.
const square = svg
    .replace(
        /<g filter="url\(#filter0_ii_2001_48\)">\s*<path d="[^"]*" fill="url\(#paint0_linear_2001_48\)"\/>\s*<\/g>/,
        '<g filter="url(#filter0_ii_2001_48)"><rect width="118" height="118" fill="url(#paint0_linear_2001_48)"/></g><g transform="translate(59 59) scale(0.86) translate(-59 -59)">',
    )
    .replace(/<path d="M20\.2812 1\.42188[^>]*stroke="#F8F8F8"\/>\s*/, '')
    .replace('</g>\n<defs>', '</g></g>\n<defs>');

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function draw(markup, width, height = width, background = 'transparent') {
    await page.setViewportSize({ width, height });
    await page.setContent(
        `<!doctype html><body style="margin:0;background:${background}">${markup}</body>`,
    );

    return page.screenshot({ omitBackground: true, type: 'png' });
}

const icon = (source, size) =>
    draw(source.replace('width="118" height="118"', `width="${size}" height="${size}"`), size);

const png = (path, bytes) => writeFileSync(path, bytes);

png('public/favicon.png', await icon(svg, 96));
png('public/icons/icon-192.png', await icon(svg, 192));
png('public/icons/icon-512.png', await icon(svg, 512));
png('public/icons/apple-touch-icon.png', await icon(square, 180));
png('public/icons/maskable-512.png', await icon(square, 512));

// An .ico that holds PNGs: what browsers that ask for /favicon.ico get.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((size) => icon(svg, size)));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, index) => {
    const at = 6 + 16 * index;
    header.writeUInt8(size, at);
    header.writeUInt8(size, at + 1);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(images[index].length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += images[index].length;
});
writeFileSync('public/favicon.ico', Buffer.concat([header, ...images]));

// The picture a link to the app shows when it is shared.
const mark = svg.replace('width="118" height="118"', 'width="168" height="168"');
png(
    'public/og.png',
    await draw(
        `<div style="box-sizing:border-box;width:1200px;height:630px;padding:0 96px;background:#111;color:#fff;display:flex;align-items:center;gap:56px;font-family:Helvetica,Arial,sans-serif">
            <div style="flex:none">${mark}</div>
            <div><div style="font-size:104px;line-height:1.05">Stashlist</div>
            <div style="margin-top:20px;font-size:40px;color:#9a9a9a">A place for everything worth keeping.</div></div>
        </div>`,
        1200,
        630,
        '#111',
    ),
);

await browser.close();
