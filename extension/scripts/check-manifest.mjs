// Fails when a store build asks for more than the listing promises. WXT adds the `matches` of a content script
// to host_permissions, so one careless entrypoint would make the install prompt read "all websites".
// Run after `npm run build` and `npm run build:firefox`.
import { readFileSync } from 'node:fs';

const EXPECTED = {
    permissions: [
        'activeTab',
        'alarms',
        'contextMenus',
        'scripting',
        'storage',
    ],
    host_permissions: ['https://stashlist.app/*'],
    optional_host_permissions: ['https://*/*', 'http://*/*'],
};

let failed = false;

for (const build of ['chrome-mv3', 'firefox-mv3']) {
    const manifest = JSON.parse(
        readFileSync(`.output/${build}/manifest.json`, 'utf8'),
    );

    for (const [key, expected] of Object.entries(EXPECTED)) {
        const actual = [...(manifest[key] ?? [])].sort();

        if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) {
            failed = true;
            console.error(
                `${build}: ${key} is ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`,
            );
        }
    }

    if (manifest.content_scripts !== undefined) {
        failed = true;
        console.error(`${build}: content_scripts must not be in the manifest.`);
    }
}

if (failed) {
    process.exit(1);
}

console.log('Manifests ask for what the listing says.');
