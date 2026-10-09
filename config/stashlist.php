<?php

declare(strict_types=1);

return [
    /*
     |--------------------------------------------------------------------------
     | Admins
     |--------------------------------------------------------------------------
     |
     | Emails allowed into Horizon (and later Pulse) outside the local
     | environment: STASHLIST_ADMINS="you@example.com,other@example.com".
     |
     */

    'admins' => array_values(array_filter(array_map(trim(...), explode(',', (string)env('STASHLIST_ADMINS', ''))))),

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
