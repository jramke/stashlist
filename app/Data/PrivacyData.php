<?php

declare(strict_types=1);

namespace App\Data;

use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * What the privacy page needs to know about this installation: who runs it, and which outside services it uses,
 * so the page lists only the ones that apply.
 */
#[TypeScript]
final readonly class PrivacyData
{
    /**
     * @param  list<string>  $sign_in  the sign-in providers that are switched on ("GitHub", "Google")
     */
    public function __construct(
        public string $operator_name,
        public string $operator_address,
        public string $operator_email,
        public bool $ai,
        public string $ai_provider,
        public array $sign_in,
        public bool $object_storage,
    ) {}
}
