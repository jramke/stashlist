# Implementation progress

This file is the resume point for building Stashlist from the plan in `docs/PLAN.md` (local and gitignored, so it can be missing on another machine; section numbers below refer to it). Started 2026-10-10.

## How to resume

1. Run `git log --oneline -15` and `git status`: the newest commits show where the last session stopped.
2. Take the first unchecked item under **Now**. The plan section is in brackets.
3. Run everything through `ddev` (see `CLAUDE.md`). `ddev composer test` must be green before every commit.
4. Commit one logical step at a time. Tick the item and update **Now** in the same commit.
5. When the plan and reality disagree, do what works, then note it under **Decisions and deviations**.

## Now

M0, step 4b: Horizon with supervisors, Redis for queue, cache and sessions.

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
- [ ] `laravel/horizon` with supervisors per queue, Redis for queue, cache and sessions, admin gate [4.3, 7.5]
- [ ] `league/flysystem-aws-s3-v3`, `intervention/image`, `fivefilters/readability.php`; `ext-*` requirements; S3 env [7.2]
- [ ] `license` fields set to `AGPL-3.0-or-later` in `composer.json` and `package.json` [M0]
- [ ] Migrations: users columns, `oauth_accounts`, `stashes`, `stash_files`, `tags`, `stash_tag`, `collections`, `collection_stash`, `usage_monthly` [1.3]
- [ ] Enums, models, `UserScope`, `BelongsToUser` [3, 3.1]
- [ ] Pest arch tests and the cross-user isolation tests [10.1]

Ships when `composer test` is green on MariaDB and an isolation test proves user A cannot read user B's stash.

### M1. Save, browse, keyword search, deploy [9]

- [ ] `InputClassifier`, `CapturePayload`, `CaptureStash` [4.2, 6.1]
- [ ] `UrlGuard`, `SafeHttp` and the SSRF test list [5.6, 10.3]
- [ ] `stash_enrichments` migration, `ExtractContent` v0 (title, description, OG image, favicon, readability text) [5.1 to 5.3]
- [ ] `ImageProcessor` (thumb, preview, colors), `StashStorage` (paths, signed URLs) [5.4]
- [ ] `TagSync`, `TagNormalizer` (manual tags) [1.4]
- [ ] Inertia pages: feed (masonry, keyset pagination), capture box, detail drawer, collections, tags [6.2]
- [ ] Keyboard and speed contract: command menu, grid navigation, quick-add, undo delete, shortcut sheet [11.2]
- [ ] Scout keyword search through `StashSearch`, as-you-type contract, `scout:sync-index-settings` [2.2, 2.5]
- [ ] Socialite login for GitHub and Google with the linking rules [6.4]
- [ ] Horizon dashboard and Pulse behind the admin gate [7.5]
- [ ] `stashlist:import-old` [M1 list]
- [ ] `DeleteStash`, `PurgeStashFiles` [4.9]
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
- 2026-10-10: this file is tracked on purpose so the progress can be followed in git. Delete it whenever you do not need it.
