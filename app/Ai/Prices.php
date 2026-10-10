<?php

declare(strict_types=1);

namespace App\Ai;

/**
 * What a call costs, estimated from token counts and the prices in config('stashlist.ai.prices').
 */
final class Prices
{
    /**
     * Cost in micro-dollars (USD * 1e6). With prices in USD per million tokens that is simply tokens times price.
     * A model without a price counts as free, so an unknown model never blocks work.
     */
    public static function cost(string $model, int $tokensIn, int $tokensOut): int
    {
        /** @var array{0: float|int, 1: float|int}|null $price */
        $price = config("stashlist.ai.prices.{$model}");

        return $price === null ? 0 : (int)round(($tokensIn * $price[0]) + ($tokensOut * $price[1]));
    }
}
