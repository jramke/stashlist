<?php

declare(strict_types=1);

namespace App\Extraction;

/**
 * Tells globally routable addresses from everything a server must never fetch.
 */
final class PublicAddress
{
    /**
     * PHP's global-range filter rejects private, loopback, link-local, CGNAT, documentation, reserved and
     * IPv4-mapped addresses. It still lets multicast and NAT64 (64:ff9b::/96, which can embed a private IPv4
     * address) through, so those are refused here.
     */
    public static function isPublic(string $ip): bool
    {
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_GLOBAL_RANGE) === false) {
            return false;
        }

        $bytes = inet_pton($ip);

        if ($bytes === false) {
            return false;
        }

        $first = ord($bytes[0]);

        if (strlen($bytes) === 4) {
            return $first < 224;
        }

        return $first !== 0xff && ! str_starts_with($bytes, "\x00\x64\xff\x9b");
    }

    /**
     * @param  list<string>  $ips
     */
    public static function allPublic(array $ips): bool
    {
        return array_all($ips, self::isPublic(...));
    }
}
