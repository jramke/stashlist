<?php

declare(strict_types=1);

namespace App\Extraction;

/**
 * Finds what something costs in the things a page describes (JSON-LD): the price of an offer, the lowest of a range
 * of offers, or the price of a price specification.
 */
final class Offers
{
    /**
     * @param  list<array<array-key, mixed>>  $nodes
     */
    public static function priceIn(array $nodes): ?Price
    {
        foreach (self::offers($nodes) as $offer) {
            $price = self::priceOf($offer);

            if ($price !== null) {
                return $price;
            }
        }

        return null;
    }

    /**
     * The offers among the nodes: a node that is an offer itself, and the offers of the other nodes.
     *
     * @param  list<array<array-key, mixed>>  $nodes
     * @return list<array<array-key, mixed>>
     */
    private static function offers(array $nodes): array
    {
        $offers = [];

        foreach ($nodes as $node) {
            $isOffer = array_intersect(JsonLd::typesOf($node), ['offer', 'aggregateoffer']) !== [];

            array_push($offers, ...$isOffer ? [$node] : JsonLd::nodesIn($node['offers'] ?? null));
        }

        return $offers;
    }

    /**
     * @param  array<array-key, mixed>  $offer
     */
    private static function priceOf(array $offer): ?Price
    {
        $specification = JsonLd::nodesIn($offer['priceSpecification'] ?? null)[0] ?? [];

        return Price::tryFrom(
            $offer['price'] ?? $offer['lowPrice'] ?? $specification['price'] ?? null,
            $offer['priceCurrency'] ?? $specification['priceCurrency'] ?? null,
        );
    }
}
