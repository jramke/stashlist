# Implementation progress

This file is the resume point for building Stashlist from the plan in `docs/PLAN.md` (local and gitignored, so it can be missing on another machine; section numbers below refer to it). Started 2026-10-10.

## How to resume

1. Run `git log --oneline -15` and `git status`: the newest commits show where the last session stopped.
2. Take the first unchecked item under **Now**. The plan section is in brackets.
3. Run everything through `ddev` (see `CLAUDE.md`). `ddev composer test` must be green before every commit.
4. Commit one logical step at a time. Tick the item and update **Now** in the same commit.
5. When the plan and reality disagree, do what works, then note it under **Decisions and deviations**.

## Now

M0 is done in code (`composer test` green on MariaDB, user A cannot read user B's rows). Left for M0: the `LICENSE` file and the buckets, both waiting on you (see above).

M1 in progress. Search works end to end: `GET /stashes?q=...&mode=keyword|hybrid` (hybrid is keyword until M3), checked against a real Meilisearch, with a plain search box in the feed (not yet seen in a browser: no Playwright yet). Sign-in with GitHub and Google works in code (tests fake the providers; it needs OAuth apps from you to try for real). Next: Pulse and the admin gate, `stashlist:import-old`, and the Playwright flows with the bundle-size check.

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
- [x] Web write path: `POST /stashes` (capture box, rate limited 60/min), `PATCH` (title, body, privacy; restarts the pipeline only when the content hash changed), `DELETE` with a 10 s undo window (`DELETE /stashes/{stash}/deletion` undoes), `POST .../reprocess` (10/min), stash tags add and remove, form requests, HTTP isolation matrix [6.2, 10.1]
- [x] Collections and tags controllers: collection CRUD with stash counts, sidebar order, stashes of a collection (set and order), the per-stash collection picker, tag list, rename (conflicts refused; merge is M5) and delete [6.2]
- [x] React pages and layout: app frame with sidebar, feed (masonry, infinite scroll, polling while cards are fetched, filter chips), capture box (paste, drop, private), detail view (edit, tags, collections, retry, delete with undo), collections and tags pages. Plain and mouse-driven; polish and the keyboard layer are yours [6.2, 11.2]
- [ ] Keyboard and speed contract: command menu, grid navigation, quick-add, undo delete, shortcut sheet [11.2]
- [x] `Stash` is `Searchable` (`StashSearchable`): the document comes from the stash, its enrichment, visible tags and collections; a save reindexes only when a searchable column changed; `MakeSearchableUniquely` folds rapid saves of one stash into one queued job [2.2, 2.5]
- [x] `IndexStash` (queue `index`, last stage of the chain for every type, sets `indexed_at` without touching `updated_at`); tag and collection changes queue a reindex (`Stash::reindex`, `TagSync`, `CollectionSync`) [4.2]
- [x] Scout keyword search through `StashSearch` (owner filter first and enforced, tag/type/collection filters, 60 per page), the as-you-type request contract (`q`, `mode`, 90/min limit that only counts searches), isolation tests against a real Meilisearch in CI [2.2, 2.5, 2.6, 10.1]
- [x] Search box in the feed UI (`SearchBox`): keyword request after about 120 ms, hybrid after 400 ms for three characters or more, partial reload of `stashes` and `filters`, `preserveState`, `replace`; the failed-status chip hides while searching [2.5]
- [x] Socialite login for GitHub and Google with the linking rules: `ResolveSocialUser`, the four old paths, buttons on the login and register pages when a provider is configured, passwordless accounts [6.4]
- [ ] Horizon dashboard and Pulse behind the admin gate [7.5]
- [ ] `stashlist:import-old` [M1 list]
- [x] `DeleteStash` (real delete in a transaction, tag counters recounted) and `PurgeStashFiles` (queued after commit, 5 tries); the Meilisearch side follows with `Searchable` [4.9]
- [ ] Playwright keyboard flows and the bundle-size check in CI [10.6]
- [ ] You: Coolify resources, backups, restore drill; spikes for Hetzner S3 and the all-in-one container [7.1, M1 spikes]

### M1.5. Browser extension v1 [6.3, 6.5]

- [ ] Sanctum tokens, token settings page, `/api/v1` endpoints, rate limits, `Idempotency-Key`, contract tests
- [ ] `CaptureStash` accepts the `capture` block
- [ ] `extension/` with WXT, React, Tailwind and `defuddle`: popup, context menus, quick clip, options page, Chrome and Firefox builds
- [ ] Repo hygiene for `extension/` (own tsconfig, prettier ignores, CI job)
- [ ] Store prep (privacy page, permission texts, listing); Defuddle spike

### M1.6. Persistent highlights [6.5]

- [ ] `stash_highlights`, endpoints, index and ETag sync, caps, search and embedding text
- [ ] Shared URL normalization with one JSON fixture, tested in PHP and TypeScript
- [ ] Extension: highlight, anchoring, painting, local index, opt-in all-sites permission
- [ ] Web app: highlights in the detail view with text-fragment links; anchoring spike

### M2. Auto-tagging [4, 9]

- [ ] `laravel/ai`, `config/stashlist.php`, `StashEnricher`, `EnrichmentResult`, `TagVocabulary`, `TagSync::applyAi`
- [ ] Pipeline: `StartPipeline`, `PipelineJob`, `GenerateEnrichment`, `stash_runs`, `UsageRecorder`, rate limiters, circuit breaker, sweeper, retry job
- [ ] Private flag and `ai_enabled` end to end: `PurgeAiData`, `Stash::skipsAi()`, `AiGuard`
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
