#!/bin/sh
# Starts a Stashlist container: the first container to run (RUN_MIGRATIONS=true) brings the database and the search
# index settings up to date, and every container caches its configuration from the environment it was given.
set -e

cd /app

if [ -z "$APP_KEY" ]; then
    echo "APP_KEY is not set. Make one with:  docker run --rm <image> php artisan key:generate --show" >&2
    exit 1
fi

php artisan package:discover --ansi >/dev/null
php artisan optimize >/dev/null

if [ "$RUN_MIGRATIONS" = "true" ]; then
    php artisan migrate --force
    php artisan scout:sync-index-settings
fi

exec docker-php-entrypoint "$@"
