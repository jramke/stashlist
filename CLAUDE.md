# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Laravel 13 + Inertia 3 + React 19 (TypeScript, React Compiler) + Tailwind 4 + shadcn/ui on **Base UI** (not Radix). PHP 8.4, Pest, MariaDB 11.8 (dev, tests and CI; tests use their own `stashlist_test` database, which a DDEV `post-start` hook creates). Local dev runs in DDEV (`.ddev/`), which also runs Redis 7 (official add-on, `noeviction` like production, `ddev redis-cli`) and Meilisearch 1.54 (`.ddev/docker-compose.meilisearch.yaml`, dashboard at https://stashlist.ddev.site:7701, host `meilisearch:7700` inside the containers).

## Plan and progress

The product plan is `docs/PLAN.md` (local, gitignored). `docs/PROGRESS.md` is the resume point: read it before continuing the work, commit one logical step at a time with `ddev composer test` green, and tick the checklist (and the **Now** line) in the same commit.

## Commands

**Run everything inside the DDEV container whenever possible: prefix every command with `ddev`.** `vendor/` and `node_modules/` are installed for the container's platform (Linux), so host-side tools can fail or behave differently (host `vite build` cannot find rolldown's native binary, mago downloads a different binary per platform). Shortcuts exist for `ddev composer`, `ddev artisan`, `ddev npm`, `ddev npx`, `ddev php` and `ddev vite`; for anything else use `ddev exec <command>`. Only `git`, `gh` and file edits stay on the host.

```bash
ddev composer setup       # install, .env, key, migrate, typescript:transform, npm install, build
ddev composer dev         # php artisan dev: serve + queue + pail logs + vite + typescript:transform --watch
ddev vite                 # only the Vite dev server, proxied at https://vite.stashlist.ddev.site
ddev npm run build        # vite build + SSR bundle (bootstrap/ssr)

ddev composer test        # everything CI runs: mago format --check, lint, analyze; typescript:transform; prettier --check + tsc; php artisan test
ddev artisan test --filter=ProfileUpdateTest   # single test / file (Pest)
ddev composer lint        # mago lint+analyze with --fix --unsafe --potentially-unsafe, then mago format (rewrites code)
ddev composer format      # mago format (PHP only)
ddev npm run format       # prettier --write . (non-PHP files only); pass files with `-- <file>...`
ddev npm run check        # prettier --check + tsc --noEmit
ddev artisan typescript:transform   # regenerate the PHP -> TypeScript types
ddev artisan scout:sync-index-settings   # push the index settings of config/scout.php to Meilisearch (run on every deploy)
ddev artisan scout:import 'App\Models\Stash'   # index every stash again from the database (stashlist:reindex does the same, per user too)
ddev artisan stashlist:reembed [--to=text_v2] [--user=ID] [--dry-run]   # embed again what has no vector from the current model and recipe
ddev artisan stashlist:reconcile-index [--dry-run]   # remove ghost documents, queue missing ones, list failed index tasks
ddev artisan stashlist:small-thumbs [--user=ID] [--dry-run]   # make the small (400 px) thumbnail of pictures processed before it existed (run once after deploying it)
ddev artisan stashlist:favicons [--user=ID] [--dry-run]   # queue the fetch of the site icon of every link that has none (run once after deploying it; new links get theirs in the pipeline)
node scripts/make-icons.mjs   # on the HOST (it drives the Chrome installed on the Mac): makes public/favicon.png|ico, public/icons/*, public/og.png from public/favicon.svg, the one source of the app icon
ddev artisan stashlist:search-eval --user=ID    # score the search on your own queries (storage/app/search-eval.json)
ddev artisan stashlist:search-spike --docs=1000000   # measure the engine on synthetic documents with vectors
ddev npm run build && ddev npm run check:bundle   # the JavaScript of a first visit to the feed must stay under 170 KiB gzipped (CI runs it too; 150 until the zag machines, see docs/PROGRESS.md)
npm run e2e               # browser flows (Playwright) against the DDEV site, run on the HOST so it can use the Chrome installed there; see below. Includes the extension flows (project `extension`)
ddev artisan stashlist:import-old dump.sql --user=ID [--old-user=ID] [--dry-run]   # one-time import of the old app's saves (app/Import)
```

To run Artisan against the test database use `ddev exec 'DB_DATABASE=stashlist_test php artisan ...'`. `--env=testing` does **not** switch databases: `migrate:fresh --env=testing` wiped the dev database once. Never run `migrate:fresh`, `db:wipe` or `migrate:rollback` without pinning `DB_DATABASE` first.

**Browser flows** (`e2e/`, Playwright) are the one thing that runs on the host: they drive the Chrome installed on the Mac (`channel: 'chrome'`, no browser download) against https://stashlist.ddev.site and call `ddev exec` to drain the queue (`E2E_QUEUE=sync` skips that, which CI sets). They need the production build (`ddev npm run build`), sign up their own people (`e2e-*@example.test`) and remove them again in the teardown. CI runs the same flows against `php artisan serve` with a synchronous queue (job `e2e`). The DDEV site has the real OpenAI key, so while a flow runs the model may tag a stash and write a summary (and a tag keeps the spelling it was first made with): match text exactly or in any case, and do not assert that a stash has no tag. Fix a failing flow by fixing the app: three real bugs (delete not hiding the card, duplicated cards after a search, a 500 without index settings) came out of the first run.

A `PostToolUse` hook (`.claude/hooks/format.sh`) formats every file you write or edit (PHP via mago, everything else via Prettier, Blade skipped) and regenerates the TypeScript types when `app/Data` or `app/Enums` changed. Do not run the formatters by hand after edits.

## Tooling decisions

- **PHP: Mago only** (`mago.toml`) for format, lint and analyze. No Pint or PHPStan. Config and `database/migrations` are excluded from lint/analyze but still formatted; `tests` is excluded from analyze. There is no baseline: fix issues in code, or use an inline `// @mago-expect lint:<rule>` / `// @mago-expect analysis:<code>` for framework-magic false positives (see `routes/console.php`, `app/Models/User.php`). Mago cannot see Facade macros, so prefer real methods over macros (e.g. `Route::get(..., Inertia::render())` instead of `Route::inertia`).
- **JS: npm** (not pnpm), plain `vite` (not Vite Plus). `.npmrc` sets `ignore-scripts=true`.
- **Prettier** formats everything except PHP (`.prettierignore`), with `prettier-plugin-organize-imports` and `prettier-plugin-tailwindcss` (sorts classes in `cn`/`clsx`/`cva`). There is no JS linter.
- **Light mode only.** `:root` in `resources/css/app.css` holds the shadcn variables (borders are slightly transparent black, so they sit on any surface); there is no `.dark` block, no theme hook and no toggle. The `dark:` classes of generated shadcn components were removed; do not add dark styles back, and strip `dark:` from components the registry adds.

## Architecture

- **Auth is Laravel Fortify with Inertia views**, configured in `app/Providers/FortifyServiceProvider.php`. Only registration and login are enabled (no password reset, email verification or 2FA). `CreateNewUser` (`app/Actions/Fortify`) creates users; home redirect is `/` (`config/fortify.php`). GitHub and Google sign-in is Socialite (`SocialLoginController`, `App\Actions\Auth\ResolveSocialUser`) on the old app's four paths (`/login/{provider}` and `/login/{provider}/callback`); a provider is on when `GITHUB_CLIENT_ID`/`_SECRET` or `GOOGLE_CLIENT_ID`/`_SECRET` are set. Linking rule: a known provider id signs in; else a provider-verified email links to the user with that email or creates a passwordless user; an unverified email is never used.
- **Routes:** `routes/web.php` (the public pages, `home`) requires `routes/settings.php` (profile edit/update behind `auth`). Fortify registers the auth routes itself.
- **Inertia pages** live in `resources/js/pages/**` and are resolved by component name. `resources/views/app.blade.php` loads `resources/js/pages/{component}.tsx` per request. Pages named `marketing/*` (home, pricing, extension, docs, terms, imprint, changelog, privacy, compare) are the public pages: each sets its own `Page.layout = ... <MarketingLayout>` so the frame stays out of the app's first download, they get `marketing` (`App.Data.MarketingData`) from `MarketingController` and use `components/seo.tsx` for the tags crawlers read; `sitemap.xml` and `robots.txt` are routes, the comparison page is off until `STASHLIST_COMPARE_PAGE=true`. The public pages sit on the content grid (`content-grid` utility in `app.css`: text in the middle column at `--spacing-reading`, a block asks for `breakout`, `breakout-lg` or `full-width`) and have one size of type: `.one-size` on `layouts/marketing-layout.tsx` and `layouts/auth-layout.tsx` forces every descendant to the same `font-size`, so the hierarchy is weight, color and space; do not try to size text there (`e2e/marketing.spec.ts` checks it). The front page's hero (`components/hero.tsx`, `logo-poof.tsx`, `logos.tsx`) is the old site's vault: icons float, a press puffs one into the Stashlist mark with the Rive animation `public/static/poof.riv` (`lib/poof.ts` loads `@rive-app/canvas-lite` and its WebAssembly from our own origin, a moment after the page or when a hand comes near; if it fails the logo puffs with CSS), and the mark then flies into the vault (`public/static/vault.webp`, made from `vault.png`) with Motion (`motion/react`, `LazyMotion` + `m`, ease `backIn`), which sets off a shimmer that also follows the pointer; `components/product-preview.tsx` draws the app instead of a screenshot that goes stale. `auth/*` pages get `layouts/auth-layout.tsx`, every other page `layouts/app-layout.tsx`.
- **Wayfinder** generates typed route/controller helpers into `resources/js/{actions,routes,wayfinder}` (gitignored, regenerated by the Vite plugin on `dev`/`build`). Import from `@/routes/...` and `@/actions/...` instead of hardcoding URLs; run a build after changing routes or controllers. `actions/` is excluded in `tsconfig.json` because the generated `RedirectController` doesn't type-check.
- **PHP -> TypeScript types** come from `spatie/laravel-typescript-transformer` (`app/Providers/TypeScriptTransformerServiceProvider.php`). Every class or enum under `app/` with `#[TypeScript]` is written to `resources/js/generated/types.d.ts` (gitignored) as global namespaces: `App.Data.UserData`, `App.Enums.ToastType`. Anything sent to Inertia is a `final readonly` class in `app/Data` (enums in `app/Enums`); never hand-write a TypeScript twin and never hand an Eloquent model to Inertia. Regeneration runs in `composer setup`, `composer test`, under `composer dev` (watch mode) and from the hook; otherwise run `ddev artisan typescript:transform`. Wayfinder (below) covers routes, so the package's controller and route providers stay off.
- **Tenancy:** every user-owned table carries `user_id`, and links between them use composite foreign keys `(x_id, user_id)`, so a row can never point at another user's row. User-owned models use `App\Models\Concerns\BelongsToUser`: the global `UserScope` limits queries to the signed-in user (a web request without a user sees nothing; console and queue workers are unscoped, their jobs carry ids) and fills `user_id` on create. `user_id` is not mass-assignable (models use `#[Fillable]`, strict mode throws): create through the relation or assign it. `tests/Unit/ArchitectureTest.php` forbids `DB::table()` on tenant tables outside `app/Console`, `::search(` outside `app/Search` and writes to a stash's tags outside `app/Tags/TagSync.php`.
- **Search** is one Meilisearch index for all users (`config/scout.php`). `App\Search\StashSearchable` builds the documents (ids and search text; results are loaded from MariaDB), `IndexStash` is the last pipeline stage, and `App\Search\StashSearch` is the only caller of the engine: the owner filter comes first and its callback refuses to search without it. Tag and collection links live in pivot tables, so `TagSync` and `CollectionSync` call `$stash->searchable()` or `Stash::reindex($ids)` themselves. Scout's `after_commit` stays `false` (see the decisions in `docs/PROGRESS.md`). Tests use `Tests\Support\FakeSearchEngine::install()`; `tests/Feature/Search/MeilisearchTest.php` (group `meilisearch`) talks to the real server with a throwaway index prefix, skips without one, and fails instead when `MEILISEARCH_REQUIRED` is set (CI).
- **API (`routes/api.php`, `/api/v1`)** is for the browser extension and other clients with a Sanctum bearer token (`stl_` prefix, made on `/settings/tokens`, shown once, stored hashed; no cookie auth). Every route asks for an ability (`stash:create`, `stash:read`) and is rate limited per token (`api-create`, `api-lookup`). `POST /api/v1/stashes` goes through the same `CaptureStash` as the web form: JSON or multipart, `Idempotency-Key` (middleware `idempotent`), sizes capped in `config/stashlist.php` (`api.*`) and `App\Support\CleanText` on every string. The `capture` block (`CapturedPage`) carries the page text and picture the client read: with `content_markdown` the server does not fetch the page, and a picture the client sent (`meta.client_picture`) is never replaced by one the server fetched (`DeriveCapturedImage`). Highlights (`stash_highlights`, `App\Highlights\AddHighlight`) are marked from the extension through `/api/v1/highlights` and `/api/v1/stashes/{id}/highlights` (ability `highlight:manage`); `GET /api/v1/highlights/index` lists `{id, v}` with an ETag for cheap sync, `v` being the revision that grows with every edit. The stash page lists them with a link that opens the page at the passage (`App\Support\TextFragment`). Responses are explicit arrays or `App\Data\Api\*`, not the UI DTOs: they are a contract, add keys, never rename.
- **Browser extension** (`extension/`, WXT + React + Tailwind, its own `package.json`, `tsconfig.json` and `.npmrc`): popup, `Alt+Shift+S` quick clip, context menus (page, link, image, pick a color) and an options page. Run its commands inside DDEV: `ddev exec -d /var/www/html/extension 'npx wxt prepare'` once, then `npm run check|test|build|build:firefox` there (Chrome output in `extension/.output/chrome-mv3`, load it unpacked). The page is read by an unlisted script (`entrypoints/capture.ts`, Defuddle) that the background injects on demand with `activeTab` + `scripting`; there is no content script on every page unless the person turns on "Show my highlights on pages" (options page: optional all-sites permission, then `lib/highlights/page-access.ts` registers `entrypoints/highlighter.ts`). Saved pages: with the optional `tabs` permission (options page checkbox), `lib/saved.ts` keeps the hashes of the saved addresses (`GET /api/v1/stashes/hashes`, ETag) and the background puts a check on the icon of a saved page, so a visited address never leaves the browser. One-click connect: the options page's button runs `lib/connect.ts` (`identity.launchWebAuthFlow` to `/connect/extension`, `ConnectExtensionController`), the person approves, and the token comes back in the fragment of the redirect address the browser reserves for the extension; the server only sends it to `<id>.chromiumapp.org` or `<id>.extensions.allizom.org` (`ConnectExtensionRequest`), and the extension checks `state`. `lib/api.ts` is the client of the capture API, `lib/stash-tab.ts` the save used by the shortcut and the menus. The popup reads `?tab=<id>` to choose its tab, which only the browser tests use. Browser tests for it are `e2e/extension/` (Playwright project `extension`, local only): they start the installed Chrome with a debugging port and load the end-to-end build (`STASHLIST_E2E=1`: host access to every page, because nothing can answer the permission prompt) through `Extensions.loadUnpacked`, since Chrome 137 and later ignore `--load-extension`. Highlights (`extension/lib/highlights/`): `page-text.ts` turns a page into collapsed text with a map back to DOM ranges, `anchor.ts` finds a stored quote (text, prefix, suffix, old offset as a hint) again and refuses to guess between look-alikes, `paint.ts` paints with the CSS Custom Highlight API (no change to the page), `store.ts`/`sync.ts` keep a per-page copy in extension storage (`local:highlights:<sha256 of the normalized address>`) in step with the server's ETag list, `show.ts` is what the page script runs, `create.ts` reads the selection (`entrypoints/selection.ts`, injected on demand) and posts it. The address is normalized and hashed in the browser (`lib/normalize-url.ts`, same rules and fixture as PHP `UrlNormalizer`; `lib/sha256.ts` covers http pages, which have no `crypto.subtle`) and never sent. Store release steps are in `docs/extension-store.md`.
- **Raycast extension** (`raycast/`, its own `package.json`, MIT licensed for the store): `Search Stashes` (`GET /api/v1/stashes?q=`) and `Stash Link` (`POST /api/v1/stashes` with the argument or the clipboard), preferences for the address and a token. Run its commands in DDEV: `ddev exec -d /var/www/html/raycast 'npm run check'` (`ray build -e dist` first generates `raycast-env.d.ts`). It has not been run inside Raycast; `ray lint` also wants a real Raycast username as `author`.
- **AI (summary and tags)** is `laravel/ai` behind `App\Ai`: `AiGuard` is the only door (instance switch `STASHLIST_AI`, a key for the provider in `STASHLIST_LLM` = `provider:model`, and the owner's `users.ai_enabled`; there is no per-stash flag), `Enricher` is the only class that prompts the `StashEnricher` agent (an architecture test enforces it), `EnrichmentResult` checks the answer, `TagVocabulary` shows the model the user's own tags and `App\Tags\AiTagSync` + `TagMatcher` apply the tags without touching the user's choices. The pipeline is `StartPipeline` -> `ExtractContent` -> `FetchFavicon` -> `GenerateEnrichment` (a `PipelineJob`: ids only, retried for 6 h, middleware: overlap, `AiCircuitBreaker`, `user-ai` and `llm` rate limits) -> `IndexStash`, which also flips `processing` to `done`. A failed AI stage still queues `IndexStash`. Runs are logged in `stash_runs` and added to `usage_monthly` by `UsageRecorder`; `SweepStuckStashes` (10 min), `RetryFailedStashes` (nightly) and the `StashRun` prune are in `routes/console.php` (run `schedule:work` or the cron). Tests run with `STASHLIST_AI=false`; the AI ones call `Tests\Support\FakeAi::install()`. `ddev artisan stashlist:bakeoff --user=ID` compares models on a sample of a user's stashes.
- **What a link says about itself** (kind, price, picture, icon). `ExtractContent` -> `ContentExtractor` -> `LinkExtractor` reads the page: `PageParser` takes Open Graph, meta tags, the JSON-LD (`JsonLd`) and the icons the page declares (`PageIcons`: touch icons first, then the larger ones, never an SVG). The subtype (article, product, video, social, repo, paper, recipe, quote) is decided by rule in `App\Extraction\Subtypes` (the site, then the schema.org types, then the Open Graph type); the model only fills what the rules leave open, and the extension's path runs the same rules over the `capture.schema_org` it sends (capped at 50 KB: over that the whole save is a 422). The price (`meta.price` = `{amount, currency}`; `Offers` from the JSON-LD, `MarkupPrice` from microdata and Open Graph) reaches the card as `StashData::price` and is formatted by `priceOf` without a locale, because the page is rendered on the server too. A link to something that is not a page is no failure (`LinkExtractor::otherThing`): a video file is a video, anything else a File stash named as its address names it. The picture of a link is the page's own before the screenshot (`DeriveCapturedImage`: the bytes the client sent, then the address it sent, then the screenshot). **The icon of the site** is `FetchFavicon`, a stage of the chain after the page was read, and `FaviconProcessor` makes a 64 px WebP of it (`stash_files.role = favicon`, the largest picture of an `.ico`, which ImageMagick must be told is one). It is fetched from the site itself through `SafeHttp` (the icons the page declares, the client's `favicon_url`, `/favicon.ico`; at most four) and **never from a favicon service such as Google's or DuckDuckGo's: that would tell a third party every address the person keeps**. The UI only shows our stored copy (`StashData::favicon`), never `meta.favicon_url`. The job sits in the middle of the chain and must not break it: a busy stash skips the icon (`WithoutOverlapping::dontRelease`), any error is reported and swallowed. On the card (`stash-card` machine) the tile of a plain link wears the icon in place of the first letter, every other link has it small before the title, and an icon that does not load is dropped (`iconBroken`).
- **Embeddings and hybrid search.** `config/stashlist.php` `embedders` names each vector generation (`text_v1`: text-embedding-3-large at 512 dimensions); every entry gives each stash a row in `stash_embeddings` (float32 `VARBINARY`, with model, size, recipe version and an input hash) and an embedder in the Meilisearch settings (`userProvided`, built in `AppServiceProvider` from the same config). The pipeline's `GenerateEmbedding` makes the vectors, `RefreshEmbedding` makes them again (debounced) after a tag or highlight changed, `ReembedStashes` (`stashlist:reembed`) backfills a new model or recipe. The search document always carries `_vectors` for every embedder (null when there is none: the engine refuses a document that leaves it out). `QueryEmbedder` embeds only the user's own query, caches it, and on any failure answers null; `StashSearch` then sends `vector`, `hybrid` (ratio by number of words) and `rankingScoreThreshold` (0.68: unrelated documents still score about 0.6 with text-embedding-3-large, so anything lower lets the whole library through), or nothing for `mode=keyword`; every text search then also gets a score cut that follows it (`ScoreCut`: nothing under 0.75 of the score of its own best result, found with a one-hit probe request), a query under three characters, a user with smart features off, or a failed embedding. `SimilarStashes` asks the engine for the neighbours of a stored vector and fills up with shared tags.
- **Horizon (`/horizon`) and Pulse (`/pulse`)** are for admins: `User::isAdmin()` is true for a _verified_ email on the `STASHLIST_ADMINS` list (comma separated), because anyone can register an address with a password. Both are open on a local machine. Pulse shows no Gravatar, the same gate guards both. Pulse's tables are in the app database; its ingest is the default `storage` driver.
- **Fetching URLs users typed in** only goes through `App\Extraction\SafeHttp` (never `Http::get`, Guzzle or `file_get_contents`): `UrlGuard` allows http(s) on ports 80 and 443 without credentials and only public addresses, the request connects to the validated address (`CURLOPT_RESOLVE`), redirects are followed by hand, and the body has a byte cap. It needs Guzzle's cURL handler, so do not pass the `stream` option. Tests fake DNS with `Tests\Support\FakeHostResolver` and the HTTP layer with Guzzle's `MockHandler`.
- **Shared Inertia props** are the `App\Data\SharedData` DTO (`name`, `auth.user`), built in `HandleInertiaRequests`. `resources/js/types/global.d.ts` plugs it into Inertia's `sharedPageProps` and `ToastData` into `flashDataType`, so `usePage().props` and `router.on('flash')` are typed. `auth.user` is `null` for guests; use `hooks/use-auth-user.ts` on pages behind `auth`. Flash notes: `ToastData::success(...)->flash()` is shown where the change was made: a page that mounts `useFlashNote()` + `<FlashNote>` (feed box, stash page, settings, collections, tags) shows it inline; only when no page does, `hooks/use-flash-toast.ts` falls back to the Sonner `Toaster` of `app.tsx`. Prefer the inline spot for new pages.
- **Web UI.** No sidebar and no dialogs. `layouts/app-layout.tsx` is a logo, `components/account-menu.tsx` (Collections, Tags, Settings, Log out) and the page; it binds the keyboard (below) and asks the feed again after a history navigation back to it, because the cached feed may be stale. The feed (`pages/stashes/index.tsx`) has one box, `components/omnibar.tsx` (the view of the machine in `machines/omnibar`, see **State machines** below), that searches as you type (the contract of `lib/feed-url.ts`: keyword after 120 ms, hybrid after 400 ms; text that is a link, a color code, over 200 characters or multi-line is not searched) and stashes: Enter saves a link or a hex/rgb/hsl color, Cmd/Ctrl+Enter saves whatever is typed as a note (`lib/classify.ts` only has to agree with `InputClassifier` there), a pasted or dropped image or link is saved at once, and the collection and tag chips on the box come along with the stash. Filters (color, type, failed, tag, collection) are chips inside the box, made from a typed word with Tab or Space (a color word becomes a chip on Space; one Backspace turns it back into the word); the URL stays the truth (`FeedFiltersData`), the chips change optimistically until the server answers. The cards are a plain CSS grid (`components/stash-grid.tsx`) that the zag listbox machine drives (see **State machines** below). `DELETE /stashes/{id}` and its undo return to the feed the request came from (`Controller::backToFeed`). **Actions and keys:** everything a person can do from the keyboard is one entry in `commands/catalog.ts` (`id`, label, category, hotkeys in the syntax of `@zag-js/hotkeys` v2 beta, `scopes`, `inFields`, `when`, `run`). `commands/actions.ts` (`actions`) is the store: pages lend behavior to the entries that need their state with `useAction(id, handler | {run, enabled})`, switch places on with `useScope('feed' | 'stash' | 'page' | 'sheet')`, and `AppLayout` calls `actions.attach(document)`, which binds every entry that is not `local` (a `local` entry is only listed: the part of the page that owns the key handles it, like the keys inside the box). An entry fires when its scope is on, its `when` holds and somebody can do it (a lent handler, or a `run` of its own); `actions.run(id)` does the same from a menu or a button. Bare keys never fire while typing in a field, keys with Ctrl, Cmd or Alt do unless the entry says `inFields: false` (Cmd+Z, Cmd+Backspace); Escape in a field other than the box lets go of it (`field.blur`). The library reads the platform from the browser (`mod` is Cmd on a Mac and Ctrl elsewhere, and Playwright's Desktop Chrome says Windows), loads in its own chunk after the page, and does nothing until then; the shortcut sheet, the menu and the key caps (`components/keys.tsx`) are drawn from the catalog, so a key is written down once. Every entry that two places want on the same key must be told apart by scope or `when`: the library runs all commands of the same priority that match. Nothing that people do all day animates (box, popup, card focus); what animates is rare or meaningful (`animate-*` utilities in `app.css`: a new stash, a chip, a note swap, the menu and shortcut sheet), always with a reduced-motion fallback. Buttons have a little body (`.btn-3d` in `app.css`: lit top edge, gradient, edge a shade lighter than the face, sinks on press; the colors are registered `@property` values so they fade); a plain element can wear the look with `ui/button-variants.ts` without loading Base UI. Sounds are synthesized with Web Audio (`lib/sound-engine.ts`, loaded on its own so the first visit stays small; no files): `lib/sound.ts` holds the choice (localStorage `sound`; without one, off when the system asks for reduced motion, on otherwise) and `play()`, `components/sound-effects.tsx` is the one place that wires keys (clack, space, enter, backspace and a quiet release), button and link presses, the highlight moving between cards (`hooks/use-stash-grid.ts`), and the server's notes (`router.on('flash')`: success and error chimes) and refusals (`router.on('error')`). The toggle is the Sounds row of the account menu and the `m` key. Levels are `VOLUME` in the engine, tuned by ear nowhere yet. Irreversible buttons use `components/confirm-button.tsx` (press twice) instead of `confirm()`; stash fields save themselves (`components/inline-field.tsx`, 700 ms after typing and on blur).
- **State machines (zag core).** The components with many states are machines built on `@zag-js/core` (2.0.0-next.3, a beta, pinned with the other `@zag-js/*` packages) and its React adapter; Base UI stays the choice for interaction primitives. A machine lives in `resources/js/machines/<name>/`: `anatomy.ts` (the parts; each gets an attribute like `data-omnibar-chip-remove="<machine id>"`), `types.ts` (the schema: props, context, computed, guards, actions, effects, events), a pure model without React or DOM (`face.ts`, `grammar.ts`), `machine.ts` (`createMachine`), `connect.ts` (state to props of the parts) and `index.ts`; the component is a thin view: `useMachine(machine, props)`, `connect(service, normalizeProps)`, spread the part props. Things this version does that bite: `send` is asynchronous (a microtask) and a context value reads back its new value only after the next render, so what a person is typing is read from the DOM and a text field is never controlled by a machine (the omnibar's textarea is uncontrolled, `defaultValue` from `context.initial('text')`, and the machine writes to it only in `replaceText`); a state whose `on` lists an event but whose guards all fail does not fall back to the parent, and an event no state and no root handler lists is ignored, which is how `stashing` refuses a second request; computed values are recomputed on every read, so never compare their results by identity (the first version of `suggesting` did, and Tab accepted nothing); the props are copied on every render (`compact` clones plain objects), so a prop is never compared by identity either (the box's guess about the filters did, and the chips never followed the box until the server answered), and the guess belongs to the request that made it (`VISIT.END` carries its number: a request cancelled by a newer one must not clear the newer one's guess); keys are read in `connect`, where the default can still be stopped. **Stash card** (`machines/stash-card`): the phase follows the flags of the stash (`phaseOf`: failed, fetching, tagging, ready), the card remembers that it has just *arrived* when a busy phase ends, the picture has its own story (`none`, `loading`, `loaded`, `broken`) and `faceOf` picks the face (photo, swatch, note, file, or a tile with the glyph of its kind: article, product, video, social, repo, paper, recipe, quote, link). `components/stash-card.tsx` draws the gray square (a picture the browser had finished before a server-rendered page came alive has fired its load event already, so the machine asks the picture when it starts: `checkPicture`; the picture is `loading="lazy"` and has an `srcset` of the two thumbnails, `ImageProcessor` making a 640 and a 400 px one, `ThumbnailData::$srcset`); CSS reads the data attributes (`data-peek`, `data-phase`, `data-media`, `data-face`, `data-arrived`). **Omnibar** (`machines/omnibar`): states `idle`, `open` (`open.suggest` while typing, `open.menu` after a click in an empty box) and `stashing`; the context holds the text, the highlighted row, the guess about the filters (until the server answers), the error and the drag flag. The machine never touches the router: the view hands in ports (`onVisit`, `onStash`) that answer through the callbacks of the request (`failed`, `succeeded`, `settled`). `grammar.ts` is pure: chips, suggestions (rows are data, see `RowAction`), the menu, the color-word rule. **Feed grid:** `components/stash-grid.tsx` and `hooks/use-stash-grid.ts` are the zag listbox with a `gridCollection`; the column count is read from the CSS grid (`gridTemplateColumns`), so the layout stays in Tailwind. The list is one tab stop, typeahead is off (single-key shortcuts), `onSelect` only fires for a value that was not selected yet (so `clearValue()` follows it), `getPreviousRowValue` returns the item itself on the first row (`onFirstRow` is how Up leaves the grid), and the `grid.*` entries of the catalog add j and k, Escape back to the box and Backspace to delete. Moving the highlight plays the tick and prefetches the page behind the card; a key press redraws two cards and not all of them, because `StashCard` is `memo`ized and compared by what its props say (`sameCard`: the list hands in new objects with new functions on every render), each card is `content-visibility: auto` (cards off the screen cost no layout or paint, which was most of the browser's work in a long feed), and nothing fades for a key: `lib/input.ts` writes `data-input="keyboard"` or `"pointer"` on `<html>` and the `keyboard:` variant of `app.css` turns the card's transitions off, so a key held down is not chasing a fade (the playground's live grid can hold 400 cards to feel it); `lib/prefetch.ts` stays quiet around any visit that is not a GET, because the server's flash note is taken by whichever Inertia response comes next, a prefetch included. **Toasts** go through `lib/toast.ts` (`notify()` imports sonner on first use) and `components/toaster.tsx` (the Toaster is a lazy chunk), so the toast library is not in the first download; `useFlashToast` stays there because it decides which notes the page shows in place. **Playground:** `/playground/cards` shows every state of the card (types, subtypes, pictures of every shape, phases, a pipeline that can run and fail live, slow and broken pictures that load on a click, because the browser logs their 404 and 500, the real grid at four widths) and `/playground/art` makes an SVG of any size that can be slow or broken on request; both exist when `STASHLIST_PLAYGROUND` is true (default: `APP_ENV=local`), and `resources/js/playground/fixtures.ts` holds the fake stashes, whose ids are made from their content and not counted: the page is rendered on the server too, and a counter differs between the HTML and the browser (a hydration mismatch).
- **PWA and share sheet.** `public/manifest.json` (linked in `app.blade.php`, icons in `public/icons`, made from `public/favicon.svg` by `scripts/make-icons.mjs`) makes the app installable on desktop and phones; there is deliberately no service worker (an offline cache of a signed-in app is a data-leak risk, and installing does not need one). Its `share_target` is a GET to `/share` (`ShareController`, behind `auth`, so a guest signs in and comes back), which saves nothing, because any page can link there: it redirects to `/stashes?share=...` and the capture box opens with the text (`App\Support\SharedInput` picks the link out of title/text/url), one tap stashes it. Only Chrome on Android (installed app) supports share targets; iOS has none, use a Shortcut with an API token there.
- **TypeScript is deliberately strict** (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `noUnused*`, ...). Fix the code, do not loosen `tsconfig.json`, and avoid `as` casts and `any`.
- **shadcn/Base UI:** `components.json` style is `base-nova`. Components in `resources/js/components/ui` are generated by `npx shadcn@latest add <name>`; only the ones in use are kept. Base UI uses `render={<Link .../>}` instead of Radix `asChild` (add `nativeButton={false}` on `Button` when rendering a non-button). The registry may emit `import { cn } from "cn"`; change it to `@/lib/utils`.

===

<laravel-boost-guidelines>
=== foundation rules ===

# Laravel Boost Guidelines

## Foundational Context

This application is a Laravel application running on PHP 8.4. Always use the APIs that match the installed major version of each package — do not assume a version.

Before relying on a package's API, confirm its installed version:
- PHP packages: run `composer show --direct` to list direct dependencies with versions, or `composer show <vendor/package>` for a single package.
- JS packages: check `package.json` for the installed versions.

## Skills Activation

This project has domain-specific skills available in `**/skills/**`. You MUST activate the relevant skill whenever you work in that domain—don't wait until you're stuck.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts

- Do not create verification scripts or tinker when tests cover that functionality and prove they work. Unit and feature tests are more important.

## Application Structure & Architecture

- Stick to existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If a frontend change doesn't show in the UI or you get a "Unable to locate file in Vite manifest" error, run `npm run build` or ask the user to run `npm run dev` or `composer run dev`.

## Documentation Files

- You must only create documentation files if explicitly requested by the user.

=== boost rules ===

# Laravel Boost

## Tools

- Laravel Boost is an MCP server with tools designed specifically for this application. Prefer Boost tools over manual alternatives like shell commands or file reads.
- Use `database-query` to run read-only queries against the database instead of writing raw SQL in tinker.
- Use `database-schema` to inspect table structure before writing migrations or models.
- Use `get-absolute-url` to resolve the correct scheme, domain, and port for project URLs. Always use this before sharing a URL with the user.
- Use `browser-logs` to read browser logs, errors, and exceptions. Only recent logs are useful, ignore old entries.

## Searching Documentation (IMPORTANT)

- Use `search-docs` before changes that depend on Laravel ecosystem APIs, behavior, configuration, or version-specific syntax. Skip it for copy-only edits and other changes where package documentation is irrelevant. Reuse sufficient results already in context instead of searching again.
- Pass a `packages` array to scope results when you know which packages are relevant.
- Use multiple broad, topic-based queries: `['rate limiting', 'routing rate limiting', 'routing']`. Expect the most relevant results first.
- Do not add package names to queries because package info is already shared. Use `test resource table`, not `filament 4 test resource table`.

### Search Syntax

1. Use words for auto-stemmed AND logic: `rate limit` matches both "rate" AND "limit".
2. Use `"quoted phrases"` for exact position matching: `"infinite scroll"` requires adjacent words in order.
3. Combine words and phrases for mixed queries: `middleware "rate limit"`.
4. Use multiple queries for OR logic: `queries=["authentication", "middleware"]`.

## Project Rules

- This project contains committed, area-grouped rules in `.ai/rules` when that directory exists, including path-scoped framework guidelines under `.ai/rules/boost`. Before you enter plan mode or create/edit any file, you MUST first: open @.ai/rules/index.md (it maps file globs to rule files), read every rule file whose globs cover the path(s) in scope, and run `grep -rin 'keyword' .ai/rules` to catch what a path match alone misses. Do not write code until you have read and are following every matching rule. If `.ai/rules` does not exist, continue without it.

## Artisan

- Run Artisan commands directly via the command line (e.g., `php artisan route:list`). Use `php artisan list` to discover available commands and `php artisan [command] --help` to check parameters.
- Inspect routes with `php artisan route:list`. Filter with: `--method=GET`, `--name=users`, `--path=api`, `--except-vendor`, `--only-vendor`.
- Read configuration values using dot notation: `php artisan config:show app.name`, `php artisan config:show database.default`. Or read config files directly from the `config/` directory.

## Tinker

- Execute PHP in app context for debugging and testing code. Do not create models without user approval, prefer tests with factories instead. Prefer existing Artisan commands over custom tinker code.
- Always use single quotes to prevent shell expansion: `php artisan tinker --execute 'Your::code();'`
  - Double quotes for PHP strings inside: `php artisan tinker --execute 'User::where("active", true)->count();'`

=== php rules ===

# PHP

- Always use curly braces for control structures, even for single-line bodies.
- Use PHP 8 constructor property promotion: `public function __construct(public GitHub $github) { }`. Do not leave empty zero-parameter `__construct()` methods unless the constructor is private.
- Use explicit return type declarations and type hints for all method parameters: `function isAccessible(User $user, ?string $path = null): bool`
- Use TitleCase for Enum keys: `FavoritePerson`, `BestLake`, `Monthly`.
- Prefer PHPDoc blocks over inline comments. Only add inline comments for exceptionally complex logic.
- Use array shape type definitions in PHPDoc blocks.

=== deployments rules ===

# Deployment

- Laravel can be deployed using [Laravel Cloud](https://cloud.laravel.com/), which is the fastest way to deploy and scale production Laravel applications.
- Activate the `deploying-to-cloud` skill whenever deploying to Laravel Cloud, configuring Cloud environments or resources, using the Cloud CLI, or troubleshooting Cloud deployments.

=== tests rules ===

# Test Enforcement

- Add or update tests for behavior and logic changes when a test provides meaningful regression coverage.
- Pure copy, styling, and layout-only changes do not require new or updated tests.
- When test coverage applies, run the affected tests and ensure they pass.
- Test the changed behavior and its important failure modes, but do not add tests beyond them.
- Read the `testing-best-practices` skill before writing tests.

=== inertia-laravel/core rules ===

# Inertia

- Inertia creates fully client-side rendered SPAs without modern SPA complexity, leveraging existing server-side patterns.
- Components live in `resources/js/pages` (unless specified in `vite.config.js`). Use `Inertia::render()` for server-side routing instead of Blade views.
- ALWAYS use `search-docs` tool for version-specific Inertia documentation and updated code examples.
- IMPORTANT: Activate `inertia-react-development` when working with Inertia client-side patterns.

# Inertia v3

- Use all Inertia features from v1, v2, and v3. Check the documentation before making changes to ensure the correct approach.
- New v3 features: standalone HTTP requests (`useHttp` hook), optimistic updates with automatic rollback, layout props (`useLayoutProps` hook), instant visits, simplified SSR via `@inertiajs/vite` plugin, custom exception handling for error pages.
- Carried over from v2: deferred props, infinite scroll, merging props, polling, prefetching, once props, flash data.
- When using deferred props, add an empty state with a pulsing or animated skeleton.
- Axios has been removed. Use the built-in XHR client with interceptors, or install Axios separately if needed.
- `Inertia::lazy()` / `LazyProp` has been removed. Use `Inertia::optional()` instead.
- Prop types (`Inertia::optional()`, `Inertia::defer()`, `Inertia::merge()`) work inside nested arrays with dot-notation paths.
- SSR works automatically in Vite dev mode with `@inertiajs/vite` - no separate Node.js server needed during development.
- Event renames: `invalid` is now `httpException`, `exception` is now `networkError`.
- `router.cancel()` replaced by `router.cancelAll()`.
- The `future` configuration namespace has been removed - all v2 future options are now always enabled.

=== laravel/core rules ===

# Do Things the Laravel Way

- Use `php artisan make:` commands to create new files (i.e. migrations, controllers, models, etc.). You can list available Artisan commands using `php artisan list` and check their parameters with `php artisan [command] --help`.
- If you're creating a generic PHP class, use `php artisan make:class`.
- Pass `--no-interaction` to all Artisan commands to ensure they work without user input. You should also pass the correct `--options` to ensure correct behavior.

### Model Creation

- When creating new models, create useful factories and seeders for them too. Ask the user if they need any other things, using `php artisan make:model --help` to check the available options.

## APIs & Eloquent Resources

- For APIs, default to using Eloquent API Resources and API versioning unless existing API routes do not, then you should follow existing application convention.

## URL Generation

- When generating links to other pages, prefer named routes and the `route()` function.

## Testing

- When creating models for tests, use the factories for the models. Check if the factory has custom states that can be used before manually setting up the model.
- Faker: Use methods such as `$this->faker->word()` or `fake()->randomDigit()`. Follow existing conventions whether to use `$this->faker` or `fake()`.
- When creating tests, make use of `php artisan make:test [options] {name}` to create a feature test, and pass `--unit` to create a unit test. Most tests should be feature tests.

=== wayfinder/core rules ===

# Laravel Wayfinder

Use Wayfinder to generate TypeScript functions for Laravel routes. Import from `@/actions/` (controllers) or `@/routes/` (named routes).

=== pest/core rules ===

# Pest

- This project uses Pest. Create tests with `php artisan make:test --pest {name}`.
- Do not include the test suite directory in `{name}`. Use `SomeFeatureTest`, not `Feature/SomeFeatureTest`.
- Read the `testing-best-practices` skill for guidance on coverage, naming, structure, dependency isolation, and review.
- Do not delete tests or test files without approval. They are part of the application.

## Running Tests

- Run the narrowest set of tests that covers the change. Pass a file path or `--filter=testName` to `php artisan test --compact`.
- Rerun a test after each change to it.
- Run `vendor/bin/pest` to call the test runner directly. It accepts the same file path and `--filter=testName` arguments.
- After the feature tests pass, ask the user to run the complete suite with `php artisan test --compact`.

=== inertia-react/core rules ===

# Inertia + React

- IMPORTANT: Activate `inertia-react-development` when working with Inertia React client-side patterns.

</laravel-boost-guidelines>
