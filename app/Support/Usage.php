<?php

declare(strict_types=1);

namespace App\Support;

use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * What an account has used of its plan, for the usage page. A null cap is no cap.
 */
#[TypeScript]
final readonly class Usage
{
    public function __construct(
        public string $plan,
        public int $stashes,
        public ?int $stashes_cap,
        public int $storage_bytes,
        public ?int $storage_cap_bytes,
        public int $ai_stashes,
        public ?int $ai_stashes_cap,
        public string $period,
    ) {}
}
