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
ddev artisan scout:import 'App\Models\Stash'   # index every stash again from the database
```

To run Artisan against the test database use `ddev exec 'DB_DATABASE=stashlist_test php artisan ...'`. `--env=testing` does **not** switch databases: `migrate:fresh --env=testing` wiped the dev database once. Never run `migrate:fresh`, `db:wipe` or `migrate:rollback` without pinning `DB_DATABASE` first.

A `PostToolUse` hook (`.claude/hooks/format.sh`) formats every file you write or edit (PHP via mago, everything else via Prettier, Blade skipped) and regenerates the TypeScript types when `app/Data` or `app/Enums` changed. Do not run the formatters by hand after edits.

## Tooling decisions

- **PHP: Mago only** (`mago.toml`) for format, lint and analyze. No Pint or PHPStan. Config and `database/migrations` are excluded from lint/analyze but still formatted; `tests` is excluded from analyze. There is no baseline: fix issues in code, or use an inline `// @mago-expect lint:<rule>` / `// @mago-expect analysis:<code>` for framework-magic false positives (see `routes/console.php`, `app/Models/User.php`). Mago cannot see Facade macros, so prefer real methods over macros (e.g. `Route::get(..., Inertia::render())` instead of `Route::inertia`).
- **JS: npm** (not pnpm), plain `vite` (not Vite Plus). `.npmrc` sets `ignore-scripts=true`.
- **Prettier** formats everything except PHP (`.prettierignore`), with `prettier-plugin-organize-imports` and `prettier-plugin-tailwindcss` (sorts classes in `cn`/`clsx`/`cva`). There is no JS linter.
- **Light and dark mode.** `:root` in `resources/css/app.css` holds the light shadcn variables, `.dark` the dark ones, and `@custom-variant dark` keeps shadcn's `dark:` classes working. The choice (`light` | `dark` | `system`, default system) lives in `localStorage.theme`. An inline script in `resources/views/app.blade.php` sets `<html class="dark">` before first paint, `hooks/use-theme.ts` reads and writes it, `components/theme-toggle.tsx` is the switcher (mounted once in `app.tsx`), and the Sonner `Toaster` follows the hook. Never hardcode the `dark` class on `<html>`; keep the blade script and the hook in sync.

## Architecture

- **Auth is Laravel Fortify with Inertia views**, configured in `app/Providers/FortifyServiceProvider.php`. Only registration and login are enabled (no password reset, email verification or 2FA). `CreateNewUser` (`app/Actions/Fortify`) creates users; home redirect is `/` (`config/fortify.php`). GitHub and Google sign-in is Socialite (`SocialLoginController`, `App\Actions\Auth\ResolveSocialUser`) on the old app's four paths (`/login/{provider}` and `/login/{provider}/callback`); a provider is on when `GITHUB_CLIENT_ID`/`_SECRET` or `GOOGLE_CLIENT_ID`/`_SECRET` are set. Linking rule: a known provider id signs in; else a provider-verified email links to the user with that email or creates a passwordless user; an unverified email is never used.
- **Routes:** `routes/web.php` (welcome, `home`) requires `routes/settings.php` (profile edit/update behind `auth`). Fortify registers the auth routes itself.
- **Inertia pages** live in `resources/js/pages/**` and are resolved by component name. `resources/views/app.blade.php` loads `resources/js/pages/{component}.tsx` per request. A page named `welcome` gets no layout; every other page gets `layouts/auth-layout.tsx`, which takes `title`/`description` from the page's static `Page.layout = { title, description }`.
- **Wayfinder** generates typed route/controller helpers into `resources/js/{actions,routes,wayfinder}` (gitignored, regenerated by the Vite plugin on `dev`/`build`). Import from `@/routes/...` and `@/actions/...` instead of hardcoding URLs; run a build after changing routes or controllers. `actions/` is excluded in `tsconfig.json` because the generated `RedirectController` doesn't type-check.
- **PHP -> TypeScript types** come from `spatie/laravel-typescript-transformer` (`app/Providers/TypeScriptTransformerServiceProvider.php`). Every class or enum under `app/` with `#[TypeScript]` is written to `resources/js/generated/types.d.ts` (gitignored) as global namespaces: `App.Data.UserData`, `App.Enums.ToastType`. Anything sent to Inertia is a `final readonly` class in `app/Data` (enums in `app/Enums`); never hand-write a TypeScript twin and never hand an Eloquent model to Inertia. Regeneration runs in `composer setup`, `composer test`, under `composer dev` (watch mode) and from the hook; otherwise run `ddev artisan typescript:transform`. Wayfinder (below) covers routes, so the package's controller and route providers stay off.
- **Tenancy:** every user-owned table carries `user_id`, and links between them use composite foreign keys `(x_id, user_id)`, so a row can never point at another user's row. User-owned models use `App\Models\Concerns\BelongsToUser`: the global `UserScope` limits queries to the signed-in user (a web request without a user sees nothing; console and queue workers are unscoped, their jobs carry ids) and fills `user_id` on create. `user_id` is not mass-assignable (models use `#[Fillable]`, strict mode throws): create through the relation or assign it. `tests/Unit/ArchitectureTest.php` forbids `DB::table()` on tenant tables outside `app/Console`, `::search(` outside `app/Search` and writes to a stash's tags outside `app/Tags/TagSync.php`.
- **Search** is one Meilisearch index for all users (`config/scout.php`). `App\Search\StashSearchable` builds the documents (ids and search text; results are loaded from MariaDB), `IndexStash` is the last pipeline stage, and `App\Search\StashSearch` is the only caller of the engine: the owner filter comes first and its callback refuses to search without it. Tag and collection links live in pivot tables, so `TagSync` and `CollectionSync` call `$stash->searchable()` or `Stash::reindex($ids)` themselves. Scout's `after_commit` stays `false` (see the decisions in `docs/PROGRESS.md`). Tests use `Tests\Support\FakeSearchEngine::install()`; `tests/Feature/Search/MeilisearchTest.php` (group `meilisearch`) talks to the real server with a throwaway index prefix, skips without one, and fails instead when `MEILISEARCH_REQUIRED` is set (CI).
- **Horizon (`/horizon`) and Pulse (`/pulse`)** are for admins: `User::isAdmin()` is true for a _verified_ email on the `STASHLIST_ADMINS` list (comma separated), because anyone can register an address with a password. Both are open on a local machine. Pulse shows no Gravatar, the same gate guards both. Pulse's tables are in the app database; its ingest is the default `storage` driver.
- **Fetching URLs users typed in** only goes through `App\Extraction\SafeHttp` (never `Http::get`, Guzzle or `file_get_contents`): `UrlGuard` allows http(s) on ports 80 and 443 without credentials and only public addresses, the request connects to the validated address (`CURLOPT_RESOLVE`), redirects are followed by hand, and the body has a byte cap. It needs Guzzle's cURL handler, so do not pass the `stream` option. Tests fake DNS with `Tests\Support\FakeHostResolver` and the HTTP layer with Guzzle's `MockHandler`.
- **Shared Inertia props** are the `App\Data\SharedData` DTO (`name`, `auth.user`), built in `HandleInertiaRequests`. `resources/js/types/global.d.ts` plugs it into Inertia's `sharedPageProps` and `ToastData` into `flashDataType`, so `usePage().props` and `router.on('flash')` are typed. `auth.user` is `null` for guests; use `hooks/use-auth-user.ts` on pages behind `auth`. Flash toasts: `ToastData::success(...)->flash()`, shown by `hooks/use-flash-toast.ts` via the Sonner `Toaster` mounted in `app.tsx`.
- **TypeScript is deliberately strict** (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `noUnused*`, ...). Fix the code, do not loosen `tsconfig.json`, and avoid `as` casts and `any`.
- **shadcn/Base UI:** `components.json` style is `base-nova`. Components in `resources/js/components/ui` are generated by `npx shadcn@latest add <name>`; only the ones in use are kept. Base UI uses `render={<Link .../>}` instead of Radix `asChild` (add `nativeButton={false}` on `Button` when rendering a non-button). The registry may emit `import { cn } from "cn"`; change it to `@/lib/utils`.
