<?php

declare(strict_types=1);

namespace App\Data;

use App\Models\User;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * The part of a user the frontend may see. Never expose the model itself.
 */
#[TypeScript]
final readonly class UserData
{
    public function __construct(
        public int $id,
        public string $name,
        public string $email,
        public ?string $email_verified_at,
    ) {}

    public static function fromModel(User $user): self
    {
        return new self(
            id: $user->id,
            name: $user->name,
            email: $user->email,
            email_verified_at: $user->email_verified_at?->toIso8601String(),
        );
    }
}
