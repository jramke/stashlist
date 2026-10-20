# Releasing the extension

The version is the one in `extension/package.json` (2.0.0; the old listing is at 1.0.6, so every release is an update). WXT builds one package per browser:

```bash
ddev exec -d /var/www/html/extension 'npm ci && npx wxt prepare'
ddev exec -d /var/www/html/extension 'npm run zip && npm run zip:firefox'
```

The zips land in `extension/.output/`: `stashlist-extension-<version>-chrome.zip`, `...-firefox.zip` and `...-sources.zip` (AMO asks for the sources of a bundled extension). Edge Add-ons takes the Chrome zip.

## Chrome Web Store (update of the existing item)

The listing already exists: ID `flpkpkopodpmfiobdcdhffgphjibolka`. Upload the new zip to that item from the same developer account. Keep the name, refresh description, screenshots, privacy policy URL and the permission texts below. The new permissions are narrower than the old manifest (which ran a script on every page), so users get no new consent prompt.

The icons are drawn from `public/favicon.svg` by `node scripts/make-icons.mjs` (on the Mac), which writes `extension/public/icon/{16,32,48,128}.png`; build the zip after it. The 128 px file in the package is the store icon, so the update brings the new one. The screenshots (below) and the promo tiles the listing may have (small 440 x 280, marquee 1400 x 560) still show the old mark and the old logo of the web app: take them again. Google's image guide asks for the 128 px icon with the artwork at 96 px inside 16 px of transparent padding; ours fills the canvas, as the old one did.

To get the same extension ID in an unpacked build, put the listing's public key (developer dashboard, Package, "View public key") into the manifest as `key` in `extension/wxt.config.ts`. Nobody but you can fetch it.

### Permission justifications

| Permission                                               | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `activeTab`                                              | Read the page the person asks to stash, at the moment they click the toolbar button, press the shortcut or use the context menu. Nothing is read before that.                                                                                                                                                                                                                                                                                                            |
| `scripting`                                              | Run the reader (a bundled script) in that one tab; for a right-clicked image also look at the picture and the page around it (alt text, caption, size on screen, the pictures the page names) and fetch its bytes.                                                                                                                                                                                                                                                       |
| `contextMenus`                                           | The "Stash page", "Stash link", "Stash image", "Highlight selection" and "Stash color…" entries.                                                                                                                                                                                                                                                                                                                                                                         |
| `alarms`                                                 | Every 30 minutes, ask the person's Stashlist whether their highlights changed (one small request, usually answered "no change").                                                                                                                                                                                                                                                                                                                                         |
| `identity`                                               | The "Connect to Stashlist" button: open the person's Stashlist in the browser's sign-in window so they approve a token, instead of pasting one.                                                                                                                                                                                                                                                                                                                          |
| `storage`                                                | Keep the address of the person's Stashlist, their token and their defaults. The token is kept on the device only.                                                                                                                                                                                                                                                                                                                                                        |
| Optional permission `tabs`                               | Asked for after a click on the checkbox "Show a check on the icon for pages I stashed already": read the address of a tab to compare it with the hashes of what the person saved. Addresses are compared in the browser and never sent. Nothing is requested at install.                                                                                                                                                                                                 |
| Host permission `https://stashlist.app/*`                | Send stashes to the hosted service.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Optional host permissions `https://*/*` and `http://*/*` | Asked for in three cases, each after a click on the options page: the address of a self-hosted Stashlist (the browser then asks for that one address), the checkbox "Show my highlights on pages" (all sites, so a highlight is painted when the page is opened again), and a checkbox under "Stash when I save" (GitHub, X or YouTube, one site each, so a script on that site can see the star, bookmark or save the person presses). Nothing is requested at install. |
| Remote code                                              | None. All code is in the package; there is no `eval` and the reader (Defuddle) is bundled.                                                                                                                                                                                                                                                                                                                                                                               |

### Data disclosure (privacy practices tab)

- Collected: website content (the address, title, readable text, a screenshot of the visible part, the picture the person right-clicked and its alt text or caption) and authentication information (the token the person pasted), only when the person acts.
- Sent to: the person's own Stashlist, either the hosted one or a server they chose. Never to anyone else.
- Not sold, not used for anything but showing the person their own stashes, not used for credit or lending.
- Highlights: the selected passage and up to 64 characters around it, sent when the person highlights. The extension keeps a copy of the person's highlights in the browser to paint them on pages; the address of a page they visit is hashed and looked up there, and never sent anywhere.
- "Stash when I save" (off until the person turns on a site): when they star a repository on GitHub, bookmark a post on X or save a video on YouTube, the extension sends the address of that thing to their Stashlist, and for a post on X also its text, because a server cannot read X. Only the click of the person counts (a click a page makes by itself is ignored), and nothing is read or sent on a site that is not turned on.
- The only request the extension makes on its own is the half-hourly check for changed highlights, to the person's own Stashlist. No browsing history, no analytics.

## Listing text

Short description (132 characters): _Stash the page you are looking at in one gesture: link, text, picture and color, to your own Stashlist._

Long description:

> Stashlist is a place for everything worth keeping: pages, notes, images, colors. This extension saves what you are looking at in one gesture.
>
> - Click the button to stash the page. Change the title, add tags (your own tags are suggested while you type) and pick collections first, or press Alt+Shift+S to stash it at once with your defaults.
> - Right-click for more: Stash link, Stash color… (pick any color on your screen) and Stash image, which looks at the page around the picture: the page's own picture (the photo on a product page) stashes the page with it, any other picture is stashed as a picture, titled by its caption, with a link back to the page.
> - The page is read in your browser, as you see it: pages behind a login and pages built with JavaScript work, and the text, picture and screenshot come with it.
> - Select text and press Alt+Shift+H (or right-click, Highlight selection) to mark a passage. It stays in Stashlist with a link that opens the page right at it, and you can have it painted on the page every time you come back (optional, you choose it in the settings).
> - Optional: stash what you save. Turn on GitHub, X or YouTube in the settings and a star, a bookmark or a saved video is stashed too, at the moment you press it.
> - It reads a page only when you ask. Unless you turn on showing highlights on every page, or stashing what you save on a site, there is no script on any page, and nothing about the pages you visit is sent anywhere.
> - Works with stashlist.app and with a Stashlist you host yourself.
>
> You need a Stashlist account and a token: make one under Settings, API tokens.

Screenshots (1280 x 800): the popup on an article, the stash in the web app, the options page, the context menu.

## Firefox (AMO, a new listing)

- The manifest has `browser_specific_settings.gecko.id` = `extension@stashlist.app` and, for the data collection declaration AMO asks of new extensions, `data_collection_permissions` with `websiteContent` and `authenticationInfo`. If AMO's validator names a different key, fix it in `extension/wxt.config.ts`.
- Upload the Firefox zip and the sources zip; build instructions for the reviewer: `npm ci && npm run build:firefox` in `extension/`.
- Firefox keeps host permissions optional: on the first save the options page asks for the address of the Stashlist in use.
- The minimum is Firefox 140 (`strict_min_version`): that is the first with the CSS Custom Highlight API, which paints highlights without touching the page.

## Before the first release

- A privacy policy page on the website (the listing needs its URL). It needs your legal details, so it is on the "Blocked on you" list in `docs/PROGRESS.md`.
- Try the Chrome build once with a real token: `ddev exec -d /var/www/html/extension 'npm run build'`, then load `extension/.output/chrome-mv3` unpacked.
