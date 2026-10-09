<?php

declare(strict_types=1);

namespace App\Data;

use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final readonly class AuthData
{
    public function __construct(
        public ?UserData $user,
    ) {}
}
