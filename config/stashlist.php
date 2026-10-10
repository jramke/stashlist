<?php

declare(strict_types=1);

return [
    /*
     |--------------------------------------------------------------------------
     | Admins
     |--------------------------------------------------------------------------
     |
     | Emails allowed into Horizon and Pulse outside the local environment:
     | STASHLIST_ADMINS="you@example.com,other@example.com". Lower case; the
     | account must also have a verified email (see User::isAdmin()).
     |
     */

    'admins' => array_values(array_filter(array_map(
        static fn (string $email): string => mb_strtolower(trim($email)),
        explode(',', (string)env('STASHLIST_ADMINS', '')),
    ))),

    /*
     |--------------------------------------------------------------------------
     | API
     |--------------------------------------------------------------------------
     |
     | Limits of /api/v1, the capture API of the browser extension. Rates are per
     | token. Sizes cap what a client we do not control may send.
     |
     */

    'api' => [
        'creates_per_minute' => 60,
        'lookups_per_minute' => 120,
        'max_json_bytes' => 1_000_000,
        'max_markdown_bytes' => 200_000,
        'max_screenshot_kb' => 2048,
        'max_image_kb' => 20_480,
        'max_tokens_per_user' => 20,
    ],

    /*
     |--------------------------------------------------------------------------
     | Bot
     |--------------------------------------------------------------------------
     |
     | How the server identifies itself when it fetches a page for a user.
     |
     */

    'bot' => [
        'user_agent' => env('STASHLIST_BOT_USER_AGENT', 'StashlistBot/1.0 (+https://stashlist.app/bot)'),
    ],
];
