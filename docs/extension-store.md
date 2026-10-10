# Releasing the extension

The version is the one in `extension/package.json` (2.0.0; the old listing is at 1.0.6, so every release is an update). WXT builds one package per browser:

```bash
ddev exec -d /var/www/html/extension 'npm ci && npx wxt prepare'
ddev exec -d /var/www/html/extension 'npm run zip && npm run zip:firefox'
```

The zips land in `extension/.output/`: `stashlist-extension-<version>-chrome.zip`, `...-firefox.zip` and `...-sources.zip` (AMO asks for the sources of a bundled extension). Edge Add-ons takes the Chrome zip.

## Chrome Web Store (update of the existing item)

The listing already exists: ID `flpkpkopodpmfiobdcdhffgphjibolka`. Upload the new zip to that item from the same developer account. Keep the name, refresh description, screenshots, privacy policy URL and the permission texts below. The new permissions are narrower than the old manifest (which ran a script on every page), so users get no new consent prompt.

To get the same extension ID in an unpacked build, put the listing's public key (developer dashboard, Package, "View public key") into the manifest as `key` in `extension/wxt.config.ts`. Nobody but you can fetch it.

### Permission justifications

| Permission                                               | Why                                                                                                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `activeTab`                                              | Read the page the person asks to stash, at the moment they click the toolbar button, press the shortcut or use the context menu. Nothing is read before that.            |
| `scripting`                                              | Run the reader (a bundled script) in that one tab, and fetch the bytes of an image they right-clicked.                                                                   |
| `contextMenus`                                           | The "Stash page", "Stash link", "Stash image" and "Pick a color" entries.                                                                                                |
| `storage`                                                | Keep the address of the person's Stashlist, their token and their defaults. The token is kept on the device only.                                                        |
| Host permission `https://stashlist.app/*`                | Send stashes to the hosted service.                                                                                                                                      |
| Optional host permissions `https://*/*` and `http://*/*` | Only used when the person types the address of a self-hosted Stashlist on the options page; the browser then asks for that one address. Nothing is requested at install. |
| Remote code                                              | None. All code is in the package; there is no `eval` and the reader (Defuddle) is bundled.                                                                               |

### Data disclosure (privacy practices tab)

- Collected: website content (the address, title, readable text, a screenshot of the visible part) and authentication information (the token the person pasted), only when the person acts.
- Sent to: the person's own Stashlist, either the hosted one or a server they chose. Never to anyone else.
- Not sold, not used for anything but showing the person their own stashes, not used for credit or lending.
- The extension makes no request on its own: no browsing history, no analytics.

## Listing text

Short description (132 characters): _Stash the page you are looking at in one gesture: link, text, picture and color, to your own Stashlist._

Long description:

> Stashlist is a place for everything worth keeping: pages, notes, images, colors. This extension saves what you are looking at in one gesture.
>
> - Click the button to stash the page. Change the title, add tags (your own tags are suggested while you type) and pick collections first, or press Alt+Shift+S to stash it at once with your defaults.
> - Right-click for more: stash a link, an image, or pick any color on your screen.
> - The page is read in your browser, as you see it: pages behind a login and pages built with JavaScript work, and the text, picture and screenshot come with it.
> - It reads a page only when you ask. There is no script on every page and nothing is sent in the background.
> - Works with stashlist.app and with a Stashlist you host yourself.
>
> You need a Stashlist account and a token: make one under Settings, API tokens.

Screenshots (1280 x 800): the popup on an article, the stash in the web app, the options page, the context menu.

## Firefox (AMO, a new listing)

- The manifest has `browser_specific_settings.gecko.id` = `extension@stashlist.app` and, for the data collection declaration AMO asks of new extensions, `data_collection_permissions` with `websiteContent` and `authenticationInfo`. If AMO's validator names a different key, fix it in `extension/wxt.config.ts`.
- Upload the Firefox zip and the sources zip; build instructions for the reviewer: `npm ci && npm run build:firefox` in `extension/`.
- Firefox keeps host permissions optional: on the first save the options page asks for the address of the Stashlist in use.

## Before the first release

- A privacy policy page on the website (the listing needs its URL). It needs your legal details, so it is on the "Blocked on you" list in `docs/PROGRESS.md`.
- Try the Chrome build once with a real token: `ddev exec -d /var/www/html/extension 'npm run build'`, then load `extension/.output/chrome-mv3` unpacked.
