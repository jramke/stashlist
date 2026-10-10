# syntax=docker/dockerfile:1
#
# Stashlist in one image: the web server (FrankenPHP, which is Caddy with PHP built in), the queue worker (Horizon)
# and the scheduler run from it with different commands, see docker-compose.yml.

# ---------------------------------------------------------------------------------------------------------------
# PHP with what the app needs. ImageMagick reads HEIC through libheif; imagick, intl, redis and pcntl are required
# by composer.json.
FROM dunglas/frankenphp:1-php8.4-bookworm AS base

RUN apt-get update \
    && apt-get install -y --no-install-recommends libheif1 libde265-0 unzip \
    && rm -rf /var/lib/apt/lists/* \
    && install-php-extensions imagick intl pdo_mysql redis pcntl bcmath zip opcache

# ---------------------------------------------------------------------------------------------------------------
# Build: the PHP packages, then the assets. The asset build runs the app once (Wayfinder writes the route helpers
# into the front end), so it needs PHP and the packages, and a key that is not used for anything else.
FROM base AS build

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:22-bookworm-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .
RUN composer dump-autoload --optimize --no-dev --no-scripts \
    && APP_ENV=production APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= php artisan package:discover --ansi \
    && APP_ENV=production APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= npm run build \
    && rm -rf node_modules

# ---------------------------------------------------------------------------------------------------------------
# What runs.
FROM base AS runtime

WORKDIR /app

COPY --from=build /app /app

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    SERVER_NAME=:80 \
    INERTIA_SSR_ENABLED=false

COPY docker/entrypoint.sh /usr/local/bin/stashlist-entrypoint
RUN chmod +x /usr/local/bin/stashlist-entrypoint \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs storage/app/private \
    && chmod -R a+rwX storage bootstrap/cache

EXPOSE 80

ENTRYPOINT ["stashlist-entrypoint"]
CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
