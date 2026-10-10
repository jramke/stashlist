<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\ToastType;
use Inertia\Inertia;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * A toast the frontend shows once after the next Inertia response.
 */
#[TypeScript]
final readonly class ToastData
{
    public function __construct(
        public ToastType $type,
        public string $message,
    ) {}

    public static function success(string $message): self
    {
        return new self(ToastType::Success, $message);
    }

    public static function info(string $message): self
    {
        return new self(ToastType::Info, $message);
    }

    public static function error(string $message): self
    {
        return new self(ToastType::Error, $message);
    }

    public function flash(): void
    {
        Inertia::flash('toast', $this);
    }
}
