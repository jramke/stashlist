# Implementation progress

This file is the resume point for building Stashlist from the plan in `docs/PLAN.md` (local and gitignored, so it can be missing on another machine; section numbers below refer to it). Started 2026-10-10.

## How to resume

1. Run `git log --oneline -15` and `git status`: the newest commits show where the last session stopped.
2. Take the first unchecked item under **Now**. The plan section is in brackets.
3. Run everything through `ddev` (see `CLAUDE.md`). `ddev composer test` must be green before every commit.
4. Commit one logical step at a time. Tick the item and update **Now** in the same commit.
5. When the plan and reality disagree, do what works, then note it under **Decisions and deviations**.

## Now

M0 and M1 are done in code and green: `composer test` (490+ tests, mago clean, real Meilisearch in the search tests), nine browser flows (`npm run e2e`, Playwright against DDEV) and the feed's JavaScript at 143 of 150 KiB. What is left of them is yours: the keyboard layer and the Coolify/Hetzner spikes, plus the `LICENSE` file and the buckets (see below). Sign-in with GitHub and Google is written and tested with fakes; it needs OAuth apps to try for real.

M1.5 is done in code: the capture API (tokens, `/api/v1`, the `capture` block, idempotency) and the browser extension in `extension/`, with four flows in a real Chrome. What is left is yours: privacy page, screenshots, the Chrome public key and the Defuddle spike (see the checklist).

M1.6 is done in code: persistent highlights on the server and the stash page, and in the extension (`Alt+Shift+H` or the menu, painting with the CSS Custom Highlight API, a local copy kept in step by sync, an opt-in "Show my highlights on pages"), with five more flows in a real Chrome. What is left is yours: try the anchoring on real pages (see the checklist). **Next: M2, auto-tagging.**

## Blocked on you

Nothing blocks the code. These need your accounts or your OK, and are tracked here so they are not forgotten:

- [ ] Hetzner Object Storage: buckets `stashlist-media` (NBG1) and `stashlist-backups` (FSN1 or HEL1), plus an access key [7.6]. Until then dev and tests use the local disk and `Storage::fake`.
- [ ] OpenAI project with Europe data residency and its API key [7.6]. Needed from M2; tests use fakes.
- [ ] `LICENSE` file with the AGPL-3.0 text [M0]. The official text is not in the repo or `vendor/`, and I did not want to download it without asking. Say "ok, fetch it from gnu.org" (about 34 KB) or drop the file in yourself.
- [ ] GitHub and Google OAuth credentials for local dev: a second GitHub OAuth app and an extra Google redirect URI [6.4]. Needed to try the login live; tests fake Socialite.
- [ ] Business status, Polar account, store developer accounts, Coolify resources [12.3, M8, 7.1].

## Milestones

### M0. Foundations [9]

- [x] Light and dark mode, tooling cleanup, Claude format hook, PHP to TypeScript type generation, strict TypeScript (before this file existed)
- [x] MariaDB for dev, tests and CI (`stashlist_test` database, DDEV hook, CI service); `php ^8.4` in `composer.json` [1.1]
- [x] Redis 7 and Meilisearch 1.54 in DDEV [M0]
- [x] `laravel/scout` and `meilisearch/meilisearch-php` with `config/scout.php` (prefix, queue `index`, `after_commit`, Stash index settings) [2.2]
- [x] `laravel/horizon` with supervisors per queue, Redis for queue, cache and sessions, `STASHLIST_ADMINS` gate (Pulse joins the gate in M1) [4.3, 7.5]
- [x] `league/flysystem-aws-s3-v3`, `intervention/image`, `fivefilters/readability.php`; `ext-imagick`, `ext-intl`, `ext-redis`; S3 env [7.2]
- [x] `license` fields set to `AGPL-3.0-or-later` in `composer.json` and `package.json` (the `LICENSE` file waits for your OK, see above) [M0]
- [x] Migrations: users columns, `oauth_accounts`, `stashes`, `stash_files`, `tags`, `stash_tag`, `collections`, `collection_stash`, `usage_monthly` [1.3]
- [x] Enums, models, `UserScope`, `BelongsToUser`, factories [3, 3.1]
- [x] Pest arch tests, scope tests and composite-key tests (the HTTP isolation matrix grows with the routes) [10.1]

Ships when `composer test` is green on MariaDB and an isolation test proves user A cannot read user B's stash.

### M1. Save, browse, keyword search, deploy [9]

- [x] `InputClassifier` and `UrlNormalizer` (rules and cases in `tests/fixtures/url-normalization.json`, reused by the extension in M1.6) [4.2, 5.3]
- [x] `CapturePayload`, `CaptureStash` (single entry point: classify, dedupe links per user, tags, collections, uploaded original, pipeline start), `StartPipeline` (extraction only for now), `CollectionSync` [4.2, 6.1]
- [x] `UrlGuard`, `SafeHttp` and the SSRF test list (checked live against the network too) [5.6, 10.3]
- [x] `stash_enrichments` migration, page parsing (`PageParser`), `ExtractContent` job v0: title, description, OG image copied to thumbnail and preview, favicon URL, readable text, colors, subtype guess; links that serve an image become image stashes; hash-based skip, retry matrix, `force` [5.1 to 5.3]
- [x] `StashStorage` (paths, writes, purge, signed URLs) [5.4]
- [x] `ImageProcessor` (WebP thumb 640 and preview 1280 without metadata, five dominant colors, limits) [5.4]
- [x] `TagSync` (user side: add, remove, dismissed tombstones, counter cache) and `TagNormalizer`; `applyAi` joins in M2 [1.4]
- [x] Web read path: `GET /stashes` (feed: cursor pagination of 60, filters type, tags, collection, status) and `GET /stashes/{stash}` with typed DTOs (`StashData`, `StashDetailData`, ...), the ownership policy, `/` redirecting signed-in users, collections in the shared props. The React pages are placeholders for now [6.2]
- [x] Web write path: `POST /stashes` (capture box, rate limited 60/min), `PATCH` (title, body; restarts the pipeline only when the content hash changed), `DELETE` with a 10 s undo window (`DELETE /stashes/{stash}/deletion` undoes), `POST .../reprocess` (10/min), stash tags add and remove, form requests, HTTP isolation matrix [6.2, 10.1]
- [x] Collections and tags controllers: collection CRUD with stash counts, sidebar order, stashes of a collection (set and order), the per-stash collection picker, tag list, rename (conflicts refused; merge is M5) and delete [6.2]
- [x] React pages and layout: app frame with sidebar, feed (masonry, infinite scroll, polling while cards are fetched, filter chips), capture box (paste, drop), detail view (edit, tags, collections, retry, delete with undo), collections and tags pages. Plain and mouse-driven; polish and the keyboard layer are yours [6.2, 11.2]
- [ ] Keyboard and speed contract: command menu, grid navigation, quick-add, undo delete, shortcut sheet [11.2]
- [x] `Stash` is `Searchable` (`StashSearchable`): the document comes from the stash, its enrichment, visible tags and collections; a save reindexes only when a searchable column changed; `MakeSearchableUniquely` folds rapid saves of one stash into one queued job [2.2, 2.5]
- [x] `IndexStash` (queue `index`, last stage of the chain for every type, sets `indexed_at` without touching `updated_at`); tag and collection changes queue a reindex (`Stash::reindex`, `TagSync`, `CollectionSync`) [4.2]
- [x] Scout keyword search through `StashSearch` (owner filter first and enforced, tag/type/collection filters, 60 per page), the as-you-type request contract (`q`, `mode`, 90/min limit that only counts searches), isolation tests against a real Meilisearch in CI [2.2, 2.5, 2.6, 10.1]
- [x] Search box in the feed UI (`SearchBox`): keyword request after about 120 ms, hybrid after 400 ms for three characters or more, partial reload of `stashes` and `filters`, `preserveState`, `replace`; the failed-status chip hides while searching [2.5]
- [x] Socialite login for GitHub and Google with the linking rules: `ResolveSocialUser`, the four old paths, buttons on the login and register pages when a provider is configured, passwordless accounts [6.4]
- [x] Horizon dashboard and Pulse behind the admin gate (`User::isAdmin()`: verified email on `STASHLIST_ADMINS`; no Gravatar in Pulse) [7.5]
- [x] `stashlist:import-old {dump.sql} --user=ID [--old-user=ID] [--dry-run]`: reads the `save` table of the old SQL dump through in-memory SQLite, maps website/text/image/color, idempotent, then runs each new link and image through the normal pipeline (`app/Import`) [M1 list]
- [x] `DeleteStash` (real delete in a transaction, tag counters recounted) and `PurgeStashFiles` (queued after commit, 5 tries); the Meilisearch side follows with `Searchable` [4.9]
- [x] Bundle-size check in CI (`npm run check:bundle`, feed route 147.7 of 150 KiB) and Playwright browser flows (`e2e/`: sign up and out, capture, search, edit and tag, delete with undo, collections, a failing link) locally and as CI job `e2e`; the keyboard flows join them when the keyboard layer exists [10.6]
- [ ] You: Coolify resources, backups, restore drill; spikes for Hetzner S3 and the all-in-one container [7.1, M1 spikes]

### M1.5. Browser extension v1 [6.3, 6.5]

- [x] Sanctum tokens (prefix `stl_`, bearer only, no cookie auth), the token settings page (create, shown once, list with last use, revoke; account settings moved into the app frame), `GET /api/v1/me`, per-token rate limits (`api-create` 60/min, `api-lookup` 120/min)
- [x] `POST /api/v1/stashes` (JSON or multipart, `Idempotency-Key`, validation and size caps, control characters stripped), `GET /api/v1/stashes/lookup`, `GET /api/v1/tags`, `GET /api/v1/collections`, contract and isolation tests
- [x] `CaptureStash` accepts the `capture` block: page text and description skip the fetch, client picture bytes win (`DeriveCapturedImage`), an image address is fetched the safe way
- [x] `extension/` with WXT, React, Tailwind and `defuddle`: popup (title, tags with autocomplete, collections, already-saved state, screenshot), `Alt+Shift+S` quick clip with a badge as feedback, context menus (page, link, image, pick a color), options page, Chrome and Firefox (Manifest V3) builds; unit tests with saved pages and four browser flows in a real Chrome (`e2e/extension/`)
- [x] Repo hygiene for `extension/` (own package.json, tsconfig and .npmrc, prettier ignores, CI job `extension`: types, unit tests, both builds)
- [ ] Store prep: permission texts, data disclosure, listing text and release steps are in `docs/extension-store.md`; left: the privacy policy page (needs your legal details), screenshots, the Chrome public key, and the Defuddle spike on pages from your own browsing (articles, shops, X, YouTube, a JS-only app, a logged-in page) next to the server's Readability

### M1.6. Persistent highlights [6.5]

- [x] `stash_highlights` (composite key, ownership scope, revision), endpoints (create on a stash or on an address, `index` with ETag, by ids, edit, delete), caps from config, highlight texts in the search document, the stash page with "open at the passage" links and note editing. The embedding text joins in M3
- [x] Shared URL normalization with one JSON fixture, tested in PHP and TypeScript
- [x] Extension: highlight (shortcut, menu, popup button), anchoring, painting, local index and sync, opt-in all-sites permission, list and remove in the popup. Unit tests for every part and five Chrome flows (`e2e/extension/highlights.spec.ts`)
- [x] Web app: highlights in the detail view with text-fragment links
- [ ] Anchoring spike on real pages (yours): highlight a passage on a news article, a documentation page, a blog with a cookie banner and a page that changes after load; reload each and see whether the paint comes back. The engine refuses to paint rather than guess, so "not painted" is the failure to look for

### M2. Auto-tagging [4, 9]

- [ ] `laravel/ai`, `config/stashlist.php`, `StashEnricher`, `EnrichmentResult`, `TagVocabulary`, `TagSync::applyAi`
- [ ] Pipeline: `StartPipeline`, `PipelineJob`, `GenerateEnrichment`, `stash_runs`, `UsageRecorder`, rate limiters, circuit breaker, sweeper, retry job
- [ ] `ai_enabled` end to end (the only switch; no per-stash flag): a guard that stops every AI call when the user has it off, a `User` check instead of `Stash::skipsAi()`
- [ ] UI: tag chips with source, dismiss, status badge, retry, `usePoll`
- [ ] `stashlist:bakeoff` (needs the OpenAI key)

### M3. Embeddings and hybrid search [2, 9]

- [ ] Spike: 1M synthetic documents on Meilisearch
- [ ] `Embedder`, `LaravelAiEmbedder`, `EmbeddingText`, `VectorCodec`, `GenerateEmbedding`, `stash_embeddings`
- [ ] Embedder in index settings, `_vectors`, `QueryEmbedder`, hybrid `StashSearch`, similar stashes
- [ ] `stashlist:reindex`, `stashlist:reembed`, `stashlist:reconcile-index`, `stashlist:search-eval`

### M4. Images [9]

- [ ] Vision enrichment, color filter and picker, HEIC and GIF, image hash idempotency

### M5. Launch readiness [9]

- [ ] Export, account deletion, plans and `Support\Limits`, registration modes, tag rename and merge, tenant tokens, privacy page, self-host `docker-compose.yml` and README

### M5.5 and M5.6. Marketing site and hero [11]

- [ ] Marketing pages with SSR, Umami, "Mymind alternative" page (after verifying the open rows), Lighthouse CI
- [ ] Hero interaction

### M6 to M8

- [ ] M6 rich links for pasted URLs (optional)
- [ ] M7 Raycast and extension v2
- [ ] M8 billing with Polar

## Decisions and deviations

- 2026-10-10: Chrome 137 and later ignore `--load-extension`, so the extension tests start the installed Chrome with a debugging port and load the build through the DevTools protocol (`Extensions.loadUnpacked`, needs `--enable-unsafe-extension-debugging`). The test build (`STASHLIST_E2E=1`) may read every page, because no test can answer the permission prompt. The popup reads `?tab=` to pick its tab, since in the tests the popup is a page of its own. Extension flows run on a developer machine only, not in CI.
- 2026-10-10: on a 401 the extension opens its options page, where the token is pasted, and not the token page of the web app as the plan said; the options page links there. Feedback of a quick clip is the badge on the toolbar icon (tick or cross, with the reason as tooltip), not an in-page toast; a toast would need a script in the page for no gain yet.

- 2026-10-10: **no per-stash Private flag** (your call). Smart features are one setting of the account, `users.ai_enabled` (default on), changed with a checkbox on `/settings/profile`. `stashes.is_private` is dropped (new migration), and so are the capture box and detail checkboxes, the lock on cards, the `private` field of the web and API requests, `is_private` in the search document, and the extension's Private toggle and default. `PurgeAiData` is not needed: turning the switch off stops new AI work and leaves what exists. When M2 lands, one guard in front of every provider call checks the user's switch.

- 2026-10-10: the first browser run found three bugs the PHP tests could not: a deleted stash stayed in the feed during its undo window (now hidden in the feed, in search results and on its own page), a search or a polling reload appended a second copy of every card (the list is a merge prop: the search box now resets it and the list matches cards by id), and a search returned a 500 when the index settings were never synced (`scout:sync-index-settings` is part of `composer setup` now, and a failing engine shows a toast and an empty list instead of an error page).
- 2026-10-10: the budget "150 KB gzipped" is counted as 150 x 1024 bytes. Counted in thousands the feed is at 151.3 KB, 1.3 KB over; in KiB it is 147.7 with 2.3 KiB to spare. The next component in the feed route will need an offsetting cut or a decision to raise the budget.
- 2026-10-10: `stashlist:import-old` fetches nothing itself. The plan had it download `image_url` and `favicon_url`; instead every imported link and image goes through `ExtractContent`, which fetches the page again, so thumbnails and text are fresh. What the old app scraped (title, description, favicon) stays until then and for pages that no longer exist. A dead page leaves the stash as a bare link with `ai_error = fetch_gone`, as planned.
- 2026-10-10: the importer takes `--old-user`, which the plan did not have. The old database could hold several users and all of their saves would otherwise land in one account; with one user in the dump nothing needs to be passed. Groups are skipped as planned (the old app's `save_group_mm` and `group` tables are not read); mapping them to collections is a small step if you want it.
- 2026-10-10: in the old app a color's value is in the `title` column (`text` is empty) and an image's source is `image_url` (`url` is empty); the mapper follows what the old code wrote, not the column names. Imported stashes keep `created_at`; `updated_at` is the import time because the pipeline saves them again.
- 2026-10-10: the admin gate needs a verified email, which the plan did not say. Registration with a password does not verify the address, so anyone could register an address from `STASHLIST_ADMINS` before its owner and get into Horizon and Pulse. Admins sign in with GitHub or Google (verified) until email verification exists.
- 2026-10-10: `http-interop/http-factory-guzzle` is not installed. It caps `guzzlehttp/psr7` at ^2 and the app has 3.1; psr7 3 ships its own PSR-17 factory and `php-http/discovery` finds it. Checked with a live health call from the Meilisearch client.
- 2026-10-10: `retry_after` for the Redis queue is 3700 s, not the plan's 360 s. The plan's own rule says it must exceed the longest job timeout, and the maintenance supervisor runs jobs for up to 3600 s.
- 2026-10-10: Horizon 5.50 serves its assets itself (`horizon:publish` is a no-op), so nothing under `public/vendor` is committed.
- 2026-10-10: `intervention/image` resolved to v4 (the plan assumed v3) and `fivefilters/readability.php` to v4.1 (`(new Readability())->parse($html)` returns an `Article`). Both load and work in DDEV with the Imagick driver. Read their READMEs when writing `ImageProcessor` and `ExtractContent`.
- 2026-10-10: the migrations are new files that alter and create, not edits of the starter kit's `create_users_table`, so a database that already ran the old ones just migrates forward.
- 2026-10-10: Scout's `after_commit` is `false`, where the plan has `true`. That flag defers the model observer until the transaction ends, and the observer asks `searchIndexShouldBeUpdated()`, which looks at the last save only. A capture saves the stash twice in one transaction, so the insert was never indexed (the later `IndexStash` hid that). The Redis connection still pushes jobs after the commit, and `MakeSearchableUniquely` has `uniqueFor = 60` so a rolled-back dispatch cannot hold its lock forever.
- 2026-10-10: the search document has no `_vectors`, highlights or color buckets yet. They join with M1.6 (highlights), M3 (embeddings) and M4 (colors).
- 2026-10-10: `SafeHttp` downloads through a size-capped Guzzle sink instead of `stream => true`. Guzzle picks PHP's stream handler for `stream`, which ignores `CURLOPT_RESOLVE`, so the address pinning would silently not happen. Found by a live request; the tests assert the pinned entry.
- 2026-10-10: `PublicAddress` blocks multicast and NAT64 (`64:ff9b::/96`) on top of PHP's `FILTER_FLAG_GLOBAL_RANGE`, which lets both through.
- 2026-10-10: HEIC and the 12 named color buckets for the Meilisearch `colors` filter are left to M4; `ImageProcessor` accepts JPEG, PNG, GIF, WebP and AVIF and returns hex colors with their share. Animated GIFs get static derivatives of the first frame.
- 2026-10-10: while AI does not exist, the pipeline's `ai_status` stays at what `StartPipeline` sets (`skipped`); `ExtractContent` only writes `failed` with `ai_stage = extract` and an `ai_error` code. The `pending`/`processing`/`done` states and `stash_runs` arrive with M2.
- 2026-10-10: JSON-LD (price, author, date) and the YouTube/X resolvers are not in `ExtractContent` v0; they belong to the later "rich links" work (M6) and the product polish.
- 2026-10-10: tests render pages without the Vite manifest (`withoutVite()` in `Tests\TestCase`), so they do not depend on the last build.
- 2026-10-10: `mago.toml` allows 16 constructor parameters (it was 10) because the data classes in `app/Data` carry a whole card.
- 2026-10-10: the keyboard layer of 11.2 (command menu, grid navigation, shortcuts) is the part the plan leaves to you; the pages get plain mouse-driven versions first.
- 2026-10-10: this file is tracked on purpose so the progress can be followed in git. Delete it whenever you do not need it.
- 2026-10-10: the extension asks for `alarms` (a half-hourly check for changed highlights, one conditional request) and the Firefox minimum is 140, the first with the CSS Custom Highlight API. Highlights are painted by position only, so the page's own elements are never changed; a page that draws itself again is painted again after a second of quiet.
- 2026-10-10: the local copy is keyed by the SHA-256 of the normalized address, computed in the browser and looked up in extension storage, so no visited address reaches the server. `crypto.subtle` does not exist in a content script on an http page, so `lib/sha256.ts` is a small fallback that is tested against the browser's.
- 2026-10-10: turning "Show my highlights on pages" off gives back the all-sites permission. Chrome may drop the self-hosted Stashlist's own permission with it (it is one of "all sites"), so the options page checks that and asks again.
