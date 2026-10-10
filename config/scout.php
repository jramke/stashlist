<?php

declare(strict_types=1);

use App\Models\Stash;

return [
    /*
     |--------------------------------------------------------------------------
     | Default Search Engine
     |--------------------------------------------------------------------------
     |
     | Meilisearch everywhere except the tests, which use the "null" engine
     | (phpunit.xml) unless a test brings its own.
     |
     */

    'driver' => env('SCOUT_DRIVER', 'meilisearch'),

    /*
     |--------------------------------------------------------------------------
     | Index Prefix
     |--------------------------------------------------------------------------
     |
     | One index per model, prefixed per environment: "prod_stashes".
     |
     */

    'prefix' => env('SCOUT_PREFIX', ''),

    /*
     |--------------------------------------------------------------------------
     | Queue Data Syncing
     |--------------------------------------------------------------------------
     |
     | Index writes go through the "index" queue. The connection follows
     | QUEUE_CONNECTION, so tests (sync) never need Redis.
     |
     | "after_commit" stays false on purpose. It would defer Scout's model
     | observer until the surrounding transaction ends, and the observer decides
     | whether to index by looking at what the last save changed; after several
     | saves of one stash in a transaction it would look at the wrong one. The
     | Redis connection (config/queue.php) pushes jobs after the commit anyway,
     | and the job reads the stash from the database when it runs.
     |
     */

    'queue' => [
        'connection' => env('QUEUE_CONNECTION', 'redis'),
        'queue' => 'index',
    ],

    'after_commit' => false,

    'chunk' => [
        'searchable' => 500,
        'unsearchable' => 500,
    ],

    'soft_delete' => false,

    'identify' => env('SCOUT_IDENTIFY', false),

    /*
     |--------------------------------------------------------------------------
     | Meilisearch
     |--------------------------------------------------------------------------
     |
     | One index for all users with user_id as a filterable attribute.
     | Documents hold ids and search text only; results are hydrated from the
     | database, so only the id is returned. The embedder entries arrive with
     | the hybrid search milestone.
     |
     */

    'meilisearch' => [
        'host' => env('MEILISEARCH_HOST', 'http://meilisearch:7700'),
        'key' => env('MEILISEARCH_KEY'),
        'index-settings' => [
            Stash::class => [
                // The order is the attribute ranking priority.
                'searchableAttributes' => [
                    'title',
                    'tags',
                    'highlights',
                    'domain',
                    'summary',
                    'body',
                    'ocr_text',
                    'objects',
                    'content',
                    'url',
                ],
                'filterableAttributes' => [
                    'id',
                    'user_id',
                    'type',
                    'subtype',
                    'tag_ids',
                    'collection_ids',
                    'domain',
                    'colors',
                    'is_private',
                    'language',
                    'created_at',
                ],
                'sortableAttributes' => ['created_at', 'updated_at'],
                'displayedAttributes' => ['id'],
                'proximityPrecision' => 'byAttribute',
                'typoTolerance' => [
                    'enabled' => true,
                    'minWordSizeForTypos' => ['oneTypo' => 4, 'twoTypos' => 8],
                    'disableOnAttributes' => ['url', 'domain'],
                ],
            ],
        ],
    ],
];
