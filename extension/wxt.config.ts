import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

const e2e = process.env.STASHLIST_E2E === '1';

export default defineConfig({
    manifestVersion: 3,
    outDir: e2e ? '.output-e2e' : '.output',
    modules: ['@wxt-dev/module-react'],
    vite: () => ({ plugins: [tailwindcss()] }),
    manifest: ({ browser }) => ({
        name: 'Stashlist',
        description: 'Stash the page you are looking at in one gesture.',
        // Nothing is read from a page until you click, press the shortcut or use the menu (activeTab).
        permissions: [
            'activeTab',
            'alarms',
            'contextMenus',
            'identity',
            'scripting',
            'storage',
            // Optional for people; the browser tests cannot answer the prompt for it.
            ...(e2e ? ['tabs' as const] : []),
        ],
        // The browser flows (e2e/) build with STASHLIST_E2E=1: the test pages are not on a host the extension is
        // allowed on, and nothing can click the permission prompt.
        host_permissions: e2e ? ['<all_urls>'] : ['https://stashlist.app/*'],
        // The check on the icon for pages that are saved already needs the address of every tab: asked for when the
        // person turns it on, never at install.
        optional_permissions: ['tabs'],
        // A self-hosted instance is asked for at runtime, one origin at a time.
        optional_host_permissions: ['https://*/*', 'http://*/*'],
        commands: {
            quick_clip: {
                suggested_key: { default: 'Alt+Shift+S' },
                description: 'Stash page without the popup',
            },
            highlight_selection: {
                suggested_key: { default: 'Alt+Shift+H' },
                description: 'Highlight selection',
            },
        },
        ...(browser === 'firefox'
            ? {
                  browser_specific_settings: {
                      gecko: {
                          id: 'extension@stashlist.app',
                          strict_min_version: '140.0',
                          // What AMO asks of a new extension: what leaves the browser, and only on the person's action.
                          data_collection_permissions: {
                              required: [
                                  'websiteContent',
                                  'authenticationInfo',
                              ],
                          },
                      },
                  },
              }
            : {}),
    }),
});
