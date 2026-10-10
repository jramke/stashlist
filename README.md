# Stashlist

A place for everything worth keeping: links, notes, images and colors. Save with one gesture (the web app, a browser
extension with highlights that come back when you revisit a page, or an API), find it again by the words you remember
or by what it was about, and keep it all in an account you can export or delete.

- **Saves what the page said.** A link is read when you save it (or by the extension in your own browser, so pages
  behind a login work too): title, picture, readable text, colors.
- **Tags and summaries by a model, if you want them.** Your own tags are reused, the ones you add or remove are never
  touched, and one switch in your profile turns all of it off.
- **Search by words and by meaning.** "That article about sourdough starters" finds it without a shared keyword.
  Pictures are found by what is in them and by the text on them.
- **Highlights.** Mark a passage on any page; it is painted again whenever you open that page.
- **Yours.** Export everything as a zip, delete the account and everything goes with it. Free software
  (AGPL-3.0-or-later): run it yourself.

Laravel 13, Inertia and React, MariaDB, Redis, Meilisearch. The browser extension is in [`extension/`](extension).

## Run it yourself

You need Docker with Compose, and a machine with about 2 GB of RAM to spare.

```bash
git clone <this repository> stashlist && cd stashlist
cp .env.docker.example .env
```

Fill in `.env`: the passwords and `APP_KEY` are the only things you must set (the file says how to make them).
Then:

```bash
docker compose up -d --build
```

Open http://localhost:8080 and register: the first account is always allowed, even with registration closed. After
that, `STASHLIST_REGISTRATION` decides who may join: `closed`, `invite` (a link from
`docker compose exec app php artisan stashlist:invite`) or `open`.

What runs: `app` (the web server), `horizon` (the queue: reading pages, summaries, search documents, exports),
`scheduler`, MariaDB, Redis and Meilisearch. Data lives in named volumes: `files`, `mariadb`, `redis`,
`meilisearch`. Put a reverse proxy with TLS in front of `app` and set `APP_URL` to the public address.

**Without an AI key** everything works except summaries, tags and search by meaning; search is by words. With
`OPENAI_API_KEY` (or another provider, see `config/ai.php` and `STASHLIST_LLM`) they come on, for the accounts that
have them on. A local model through Ollama works too.

**Storing files** goes to the `files` volume. To use S3 or any compatible object storage instead, set
`FILESYSTEM_DISK=s3` and the `AWS_*` settings (see `config/filesystems.php`).

**Updating:** `git pull && docker compose up -d --build`. The app container migrates the database and the search
settings on start.

**Backing up and restoring:** see [`docs/operations.md`](docs/operations.md).

**The browser extension** is built from [`extension/`](extension) (see [`docs/extension-store.md`](docs/extension-store.md));
point it at your address on its options page and paste a token from _Settings, API tokens_.

## Develop

Local development runs in [DDEV](https://ddev.com) (PHP, MariaDB, Redis and Meilisearch in containers):

```bash
ddev start
ddev composer setup      # install, .env, key, migrate, assets
ddev composer dev        # the app, the queue, the logs and Vite
ddev composer test       # everything CI runs
```

[`CLAUDE.md`](CLAUDE.md) describes the architecture and the conventions; [`docs/PROGRESS.md`](docs/PROGRESS.md) says
where the work stands.
