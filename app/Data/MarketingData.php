<?php

declare(strict_types=1);

namespace App\Data;

use App\Auth\Registration;
use App\Enums\RegistrationMode;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * What the public pages need to know about this installation: whether new people can join, whether paid plans
 * can be bought, where the extension and the source live.
 */
#[TypeScript]
final readonly class MarketingData
{
    public function __construct(
        public RegistrationMode $registration,
        public bool $billing,
        public bool $compare_page,
        public string $repository_url,
        public string $chrome_store_url,
        public string $firefox_store_url,
    ) {}

    public static function resolve(): self
    {
        $registration = resolve(Registration::class);

        return new self(
            registration: $registration->isAccepting() ? $registration->mode() : RegistrationMode::Closed,
            billing: config()->string('stashlist.site.billing') === 'polar',
            compare_page: config()->boolean('stashlist.site.compare_page'),
            repository_url: config()->string('stashlist.site.repository_url'),
            chrome_store_url: config()->string('stashlist.site.chrome_store_url'),
            firefox_store_url: config()->string('stashlist.site.firefox_store_url'),
        );
    }
}
