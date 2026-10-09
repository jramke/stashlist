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
];
