<?php

declare(strict_types=1);

namespace App\Extraction;

use App\Support\UrlHost;

/**
 * Decides whether the server may fetch a URL, before any request leaves (plan 5.6).
 *
 * Only http and https on ports 80 and 443, no credentials in the URL, and every address the host
 * resolves to must be public: one private answer rejects the host.
 */
final readonly class UrlGuard
{
    /** Hosts written as one number or in hex or octal ("2130706433", "0x7f.1") are never sent to DNS. */
    private const NUMERIC_HOST = '/^(?:0x[0-9a-f]+|\d+)(?:\.(?:0x[0-9a-f]+|\d+))*$/i';

    public function __construct(
        private HostResolver $resolver,
    ) {}

    /**
     * @throws BlockedUrl
     */
    public function check(string $url): ResolvedTarget
    {
        $parts = parse_url($url);

        if ($parts === false) {
            throw BlockedUrl::malformed();
        }

        $scheme = strtolower($parts['scheme'] ?? '');

        if (
            ! in_array($scheme, ['http', 'https'], strict: true) ||
            array_key_exists('user', $parts) ||
            array_key_exists('pass', $parts)
        ) {
            throw BlockedUrl::scheme();
        }

        $port = $parts['port'] ?? ($scheme === 'https' ? 443 : 80);

        if (! in_array($port, [80, 443], strict: true)) {
            throw BlockedUrl::port();
        }

        $host = UrlHost::normalize($parts['host'] ?? '') ?? throw BlockedUrl::host();
        $ips = $this->addresses($host);

        if ($ips === [] || ! PublicAddress::allPublic($ips)) {
            throw BlockedUrl::private();
        }

        return new ResolvedTarget($scheme, $host, $port, $ips);
    }

    /**
     * @return list<string>
     */
    private function addresses(string $host): array
    {
        $literal = trim($host, characters: '[]');

        if (filter_var($literal, FILTER_VALIDATE_IP) !== false) {
            return [$literal];
        }

        if (preg_match(self::NUMERIC_HOST, $host) === 1) {
            return [];
        }

        return $this->resolver->resolve($host);
    }
}
