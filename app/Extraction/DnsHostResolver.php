<?php

declare(strict_types=1);

namespace App\Extraction;

final class DnsHostResolver implements HostResolver
{
    #[\Override]
    public function resolve(string $host): array
    {
        $ips = [];

        foreach ([DNS_A => 'ip', DNS_AAAA => 'ipv6'] as $type => $key) {
            /** @var list<array<string, int|string>>|false $records */
            $records = dns_get_record($host, $type);

            foreach ($records === false ? [] : $records as $record) {
                $ip = $record[$key] ?? null;

                if (is_string($ip)) {
                    $ips[] = $ip;
                }
            }
        }

        return $ips;
    }
}
