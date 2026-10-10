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
