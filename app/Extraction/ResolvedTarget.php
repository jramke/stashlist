<?php

declare(strict_types=1);

namespace App\Extraction;

/**
 * A URL that passed the guard, with the public addresses its host resolved to.
 */
final readonly class ResolvedTarget
{
    /**
     * @param  non-empty-list<string>  $ips
     */
    public function __construct(
        public string $scheme,
        public string $host,
        public int $port,
        public array $ips,
    ) {}

    /**
     * The value for CURLOPT_RESOLVE that pins the connection to the address that was validated, so
     * there is no second DNS lookup an attacker could answer differently.
     */
    public function curlResolveEntry(): string
    {
        $ip = $this->ips[0];

        return $this->host.':'.$this->port.':'.(str_contains($ip, ':') ? '['.$ip.']' : $ip);
    }
}
