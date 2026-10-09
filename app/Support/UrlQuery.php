<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Query string handling for URL normalization.
 */
final class UrlQuery
{
    private const TRACKING_PARAMETER = '/^(utm_.*|fbclid|gclid|mc_.*)$/';

    /**
     * Drops tracking parameters (utm_*, fbclid, gclid, mc_*) and empty segments, keeps the rest in order.
     */
    public static function withoutTracking(string $query): string
    {
        $kept = [];

        foreach (explode('&', $query) as $pair) {
            $name = strtolower(explode('=', $pair, limit: 2)[0]);

            if ($pair !== '' && preg_match(self::TRACKING_PARAMETER, $name) !== 1) {
                $kept[] = $pair;
            }
        }

        return implode('&', $kept);
    }
}
