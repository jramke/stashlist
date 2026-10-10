// Fails when the JavaScript a first visit to the feed downloads is over budget (plan 11.2: 150 KB gzipped, counted
// as 150 * 1024 bytes).
// Run after `npm run build`: it reads the Vite manifest and counts the app entry and the feed page together
// with everything they import at load time. Pages the user may open later are separate downloads.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGET = 150 * 1024;
const ROUTE = ['resources/js/app.tsx', 'resources/js/pages/stashes/index.tsx'];

const manifest = JSON.parse(readFileSync('public/build/manifest.json', 'utf8'));
const chunks = new Set();

function collect(key) {
    const chunk = manifest[key];

    if (!chunk) {
        throw new Error(
            `${key} is not in the Vite manifest. Did the build run?`,
        );
    }

    if (chunks.has(key)) {
        return;
    }

    chunks.add(key);
    (chunk.imports ?? []).forEach(collect);
}

ROUTE.forEach(collect);

let total = 0;

for (const key of chunks) {
    const file = manifest[key].file;
    const size = gzipSync(readFileSync(`public/build/${file}`)).length;

    total += size;
    console.log(`${(size / 1024).toFixed(1).padStart(7)} KB  ${file}`);
}

console.log(
    `${(total / 1024).toFixed(1).padStart(7)} KB  total gzipped, budget ${BUDGET / 1024} KB`,
);

if (total > BUDGET) {
    console.error('The feed route is over its JavaScript budget.');
    process.exit(1);
}
