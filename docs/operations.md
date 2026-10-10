# Running Stashlist

For whoever runs an installation: what is backed up, how to prove a backup works, and what to do when something
sticks. Commands are for the Docker setup of the README (`docker compose exec app ...`); on other setups run the
same `php artisan` commands wherever the app runs.

## What holds what

| Where       | What                                                  | Lost means                                          |
| ----------- | ----------------------------------------------------- | --------------------------------------------------- |
| MariaDB     | Everything of every user, vectors included            | Everything. This is the one to back up              |
| Files       | Originals people saved, thumbnails, previews, exports | The pictures (the originals are not made again)     |
| Meilisearch | A copy of the searchable parts, built from MariaDB    | Search, until it is rebuilt (below)                 |
| Redis       | The queue                                             | Jobs waiting; `SweepStuckStashes` queues them again |
| `.env`      | `APP_KEY`, passwords, provider keys                   | Keep a copy offline. Without `APP_KEY` sessions end |

## Backups

- **MariaDB, daily.** `docker compose exec mariadb mariadb-dump --single-transaction --routines -uroot -p"$DB_ROOT_PASSWORD" stashlist | gzip > stashlist-$(date +%F).sql.gz`, then copy it somewhere other than this machine (another provider, another
  region). Keep 14 days; the privacy page says backups rotate away within that time, so do not keep them longer.
- **Files, weekly.** Copy `u/*/i/*/original*` (the originals) of the storage: for the volume,
  `docker run --rm -v stashlist_files:/files -v "$PWD":/backup alpine tar czf /backup/files-$(date +%F).tar.gz /files`; for S3, turn on bucket versioning and
  sync the originals to a second bucket. Thumbnails and previews are made again; leave them out.
- **Meilisearch: none needed.** It is rebuilt from MariaDB.
- **Redis: none.**

## The restore drill

A backup nobody has restored is a hope. Do this once after setting up and every quarter. It uses a scratch database
and touches nothing live.

1. Start an empty MariaDB: `docker run -d --name drill-db -e MARIADB_ROOT_PASSWORD=drill -e MARIADB_DATABASE=stashlist mariadb:11.8`
2. Load the latest dump: `gunzip -c stashlist-YYYY-MM-DD.sql.gz | docker exec -i drill-db mariadb -uroot -pdrill stashlist`
3. Look at it: `docker exec drill-db mariadb -uroot -pdrill stashlist -e "select count(*) from users; select count(*) from stashes; select max(created_at) from stashes;"`
   The counts and the newest date should be what you expect from yesterday.
4. Prove the app can use it: run the app container against the scratch database
   (`docker run --rm --network container:drill-db -e DB_HOST=127.0.0.1 -e DB_PASSWORD=drill -e DB_USERNAME=root -e DB_DATABASE=stashlist -e APP_KEY=... stashlist:latest php artisan migrate:status`);
   every migration should say "Ran".
5. Restore a file from the file backup and open it.
6. Rebuild the search index from the scratch database to prove that needs no provider:
   point a throwaway Meilisearch at it and run `php artisan stashlist:reindex`. Documents arrive without any call to an AI provider; vectors come from the database.
7. Remove the scratch containers: `docker rm -f drill-db`. Write the date and how long it took in your notes.

## Routine

- **Deploy:** migrations first, then the search settings (the app container does both on start): `php artisan migrate --force && php artisan scout:sync-index-settings`.
  Migrations are written to be safe while the old version still runs.
- **Health:** `/up` answers when the app is up; `php artisan horizon:status` says whether the queue runs. The
  dashboards are at `/horizon` and `/pulse` for the addresses in `STASHLIST_ADMINS`.
- **Scheduler:** the `scheduler` container (or one cron line, `* * * * * php artisan schedule:run`) runs: the sweeper
  for stuck work (10 minutes), the nightly retry of what failed for a reason that passes, cleanup of old run logs and
  of expired exports.

## When something sticks

| You see                                            | Do                                                                                                                                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stashes stay on "Tagging…"                         | Is `horizon` running? Is the provider key set and valid? `php artisan stashlist:reconcile-index --dry-run` also lists failed search tasks. The sweeper requeues lost work after 30 to 60 minutes |
| "Summaries and tags are paused" on stashes         | The circuit breaker opened (a refused key, no credit, or the day's budget). Fix the cause; it closes by itself after 15 minutes, and `RetryFailedStashes` tries what is left that night          |
| Search finds nothing new                           | `php artisan stashlist:reconcile-index` queues the missing documents and removes ghosts; `php artisan stashlist:reindex` rebuilds all of them                                                    |
| Search was set up wrong (new embedder, new fields) | `php artisan scout:sync-index-settings`, then `php artisan stashlist:reindex`; for a new model `stashlist:reembed --to=NAME`                                                                     |
| Disk is filling up                                 | Exports older than a week are removed hourly; run logs after 30 days. `docker system df` and the `files` volume tell the rest                                                                    |
| A person asks for their data or its removal        | _Settings, Export_ and _Settings, Profile, Delete account_ do it themselves; nothing needs the operator                                                                                          |
