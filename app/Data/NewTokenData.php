<?php

declare(strict_types=1);

namespace App\Data;

use SensitiveParameter;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * A token that was just made, with its plain text. Flashed to the next page only: it is stored hashed and
 * cannot be shown again.
 */
#[TypeScript]
final readonly class NewTokenData
{
    public function __construct(
        public string $name,
        #[SensitiveParameter]
        public string $token,
    ) {}
}
