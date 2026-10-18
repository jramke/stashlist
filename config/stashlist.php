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
     | Registration
     |--------------------------------------------------------------------------
     |
     | Who may create an account: "open" (anyone), "invite" (a code from
     | `stashlist:invite`) or "closed" (nobody new; the first account of an empty
     | installation is always allowed). Closed unless told otherwise, so a
     | forgotten setting never opens a server to the world.
     |
     */

    'registration' => (string)env('STASHLIST_REGISTRATION', 'closed'),

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
     | Highlights
     |--------------------------------------------------------------------------
     |
     | Caps on the passages a user marks on pages: the length of one passage and
     | how many there may be of them. Prefix and suffix are context for finding
     | the passage again, not content.
     |
     */

    'highlights' => [
        'max_text' => 2000,
        'max_context' => 200,
        'max_note' => 1000,
        'per_stash' => 500,
        'per_user' => 20_000,
    ],

    /*
     |--------------------------------------------------------------------------
     | AI
     |--------------------------------------------------------------------------
     |
     | Summaries and tags come from a language model. Every call to a provider
     | goes through App\Ai\AiGuard, which refuses when `enabled` is false (a
     | self-hosted instance without keys) or when the owner turned smart features
     | off. `llm` is "provider:model" as named in config/ai.php. Prices are USD
     | per million tokens (input, output), used only to estimate cost.
     |
     */

    'ai' => [
        'enabled' => (bool)env('STASHLIST_AI', true),
        'llm' => (string)env('STASHLIST_LLM', 'openai:gpt-5-mini'),
        // Bump when the instructions change; `stashlist:reprocess --below-prompt=N` can re-run older stashes.
        'prompt_version' => 2,
        // Calls per minute: all users together, and one user (one big import must not starve the others).
        'llm_rpm' => 300,
        'embed_rpm' => 1000,
        'user_rpm' => 20,
        // Past this much estimated spend per day the circuit breaker opens until the next day.
        'daily_budget_usd' => 5.0,
        // How much of a page the model reads (characters, about 3,000 tokens).
        'input_chars' => 12_000,
        // The user's own tags shown to the model so it reuses them: the most used and the newest.
        'vocabulary' => ['top' => 150, 'recent' => 30],
        // How long the circuit breaker stays open after the provider refused our key or credit.
        'breaker_minutes' => 15,
        'prices' => [
            'gpt-5-nano' => [0.05, 0.40],
            'gpt-5-mini' => [0.25, 2.00],
            'gpt-5.4-nano' => [0.20, 1.25],
            'gpt-5.4-mini' => [0.75, 4.50],
            'text-embedding-3-small' => [0.02, 0.0],
            'text-embedding-3-large' => [0.13, 0.0],
        ],
    ],

    /*
     |--------------------------------------------------------------------------
     | Embeddings
     |--------------------------------------------------------------------------
     |
     | Every entry gives each stash a vector and an embedder in the search index
     | (under the same key). A vector is only comparable to vectors of its own
     | model and size, so to change either, add a new entry (text_v2), fill it
     | with `stashlist:reembed`, then point `search.embedder` at it.
     |
     */

    'embedders' => [
        'text_v1' => [
            'provider' => 'openai',
            'model' => 'text-embedding-3-large',
            'dimensions' => 512,
        ],
    ],

    /*
     |--------------------------------------------------------------------------
     | Search
     |--------------------------------------------------------------------------
     |
     | The semantic part of a search. `ratio` is how much the meaning counts
     | against the words, by the number of words in the query (one, two, three or
     | more): a single word is a keyword, a sentence is a meaning.
     |
     | Two cuts keep the unrelated out. `threshold` drops what scores under it in
     | a hybrid search. The scores of text-embedding-3-large are squeezed into a
     | narrow band: documents that have nothing to do with the query still score
     | about 0.6, and real neighbours 0.68 to 0.8, so a threshold under 0.65 lets
     | the whole library through (0.35 did: "plants" listed every stash). It is
     | tied to the embedder; measure it again with `stashlist:search-eval` when
     | the model changes. `relative_threshold` also drops what scores under this
     | part of the best result of the same search, so a query that has clear
     | matches shows those and not the weak neighbours behind them, while a query
     | whose best result is a loose match keeps its loose matches. Values from
     | 250 stashes of the developer's own library, 2026-10-17.
     |
     */

    'search' => [
        'embedder' => (string)env('STASHLIST_EMBEDDER', 'text_v1'),
        'ratio' => ['short' => 0.3, 'default' => 0.5, 'long' => 0.7],
        'threshold' => 0.68,
        'relative_threshold' => 0.75,
        'min_semantic_chars' => 3,
        'query_cache_seconds' => 86_400,
        // Searches are signed per user with a search-only key (`stashlist:search-key`), so the engine itself
        // refuses to show anyone another user's documents. Off while these are empty.
        'tenant' => [
            'key' => (string)env('MEILISEARCH_SEARCH_KEY', ''),
            'uid' => (string)env('MEILISEARCH_SEARCH_KEY_UID', ''),
        ],
    ],

    /*
     |--------------------------------------------------------------------------
     | Plans
     |--------------------------------------------------------------------------
     |
     | Fair-use caps by users.plan; null means no cap. `free` is you and invited
     | friends. A stash over the AI cap is saved normally and waits for the next
     | month for its summary and tags. `plan` forces one plan on every account,
     | which is how a self-hosted installation runs without limits:
     | STASHLIST_PLAN=unlimited.
     |
     */

    'plan' => (string)env('STASHLIST_PLAN', ''),

    'plans' => [
        'free' => [
            'stashes' => 2000,
            'storage_megabytes' => 2048,
            'ai_stashes_per_month' => 300,
            'searches_per_minute' => 60,
        ],
        'flat' => [
            'stashes' => 25_000,
            'storage_megabytes' => 25_600,
            'ai_stashes_per_month' => 1000,
            'searches_per_minute' => 120,
        ],
        'unlimited' => [
            'stashes' => null,
            'storage_megabytes' => null,
            'ai_stashes_per_month' => null,
            'searches_per_minute' => 600,
        ],
    ],

    /*
     |--------------------------------------------------------------------------
     | Operator
     |--------------------------------------------------------------------------
     |
     | Who runs this installation, for the privacy page: name, postal address
     | and a contact email. Left empty, the page says that the operator has not
     | filled these in yet.
     |
     */

    'operator' => [
        'name' => (string)env('STASHLIST_OPERATOR_NAME', ''),
        'address' => (string)env('STASHLIST_OPERATOR_ADDRESS', ''),
        'email' => (string)env('STASHLIST_OPERATOR_EMAIL', ''),
        // For the imprint, where the law of the operator's country asks for them.
        'phone' => (string)env('STASHLIST_OPERATOR_PHONE', ''),
        'vat_id' => (string)env('STASHLIST_OPERATOR_VAT_ID', ''),
        'register' => (string)env('STASHLIST_OPERATOR_REGISTER', ''),
    ],

    /*
     |--------------------------------------------------------------------------
     | Public site
     |--------------------------------------------------------------------------
     |
     | The pages anyone may read (home, pricing, extension, docs ...). `billing`
     | is "polar" only when paid plans can be bought; `compare_page` publishes
     | the comparison page, which stays off until every claim on it has been
     | checked again.
     |
     */

    'site' => [
        'repository_url' => (string)env('STASHLIST_REPOSITORY_URL', ''),
        'chrome_store_url' => (string)env(
            'STASHLIST_CHROME_STORE_URL',
            'https://chromewebstore.google.com/detail/flpkpkopodpmfiobdcdhffgphjibolka',
        ),
        'firefox_store_url' => (string)env('STASHLIST_FIREFOX_STORE_URL', ''),
        'billing' => (string)env('STASHLIST_BILLING', 'none'),
        'compare_page' => (bool)env('STASHLIST_COMPARE_PAGE', false),
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
