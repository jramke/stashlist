<?php

declare(strict_types=1);

use App\Extraction\JsonLd;
use App\Extraction\Offers;

test('the types of everything the page describes, graph members included, without the namespace', function () {
    $ld = JsonLd::fromDocuments([
        ['@type' => 'Product', 'name' => 'A pan'],
        ['@graph' => [['@type' => ['Article', 'schema:NewsArticle']], ['@type' => 'https://schema.org/Recipe']]],
    ]);

    expect($ld->types())->toBe(['product', 'article', 'newsarticle', 'recipe']);
});

test('a single document, as the extension sends it, and a list of nodes are both understood', function () {
    expect(JsonLd::fromDocuments(['@type' => 'Recipe'])->types())
        ->toBe(['recipe'])
        ->and(JsonLd::fromDocuments([[['@type' => 'Product'], ['@type' => 'Offer']]])->types())
        ->toBe(['product', 'offer']);
});

test('whatever else a page puts in its JSON-LD is passed over', function () {
    $ld = JsonLd::fromDocuments([
        null,
        'text',
        5,
        [],
        [[]],
        ['@type' => 12],
        ['@type' => [null, ['x']]],
        ['@graph' => 'no'],
    ]);

    expect($ld->types())->toBeEmpty()->and(Offers::priceIn($ld->nodes))->toBeNull();
});

test('only so many nodes are kept', function () {
    $ld = JsonLd::fromDocuments(array_map(static fn (int $n): array => ['@type' => "T{$n}"], range(1, 80)));

    expect($ld->nodes)->toHaveCount(50);
});

test('the price of a product is the price of its offer', function (array $document, ?array $expected) {
    expect(Offers::priceIn(JsonLd::fromDocuments($document)->nodes)?->toArray())->toBe($expected);
})->with([
    'an offer' => [
        ['@type' => 'Product', 'offers' => ['@type' => 'Offer', 'price' => '39.90', 'priceCurrency' => 'EUR']],
        ['amount' => '39.90', 'currency' => 'EUR'],
    ],
    'the first offer that has a price' => [
        ['@type' => 'Product', 'offers' => [['@type' => 'Offer'], ['price' => 12, 'priceCurrency' => 'USD']]],
        ['amount' => '12', 'currency' => 'USD'],
    ],
    'the lowest price of a range' => [
        [
            '@type' => 'Product',
            'offers' => [
                '@type' => 'AggregateOffer',
                'lowPrice' => '5.00',
                'highPrice' => '9',
                'priceCurrency' => 'GBP',
            ],
        ],
        ['amount' => '5.00', 'currency' => 'GBP'],
    ],
    'a price specification' => [
        ['@type' => 'Product', 'offers' => ['priceSpecification' => ['price' => '7,50', 'priceCurrency' => 'EUR']]],
        ['amount' => '7.50', 'currency' => 'EUR'],
    ],
    'an offer that stands alone in a graph' => [
        ['@graph' => [['@type' => 'WebSite'], ['@type' => 'Offer', 'price' => '3', 'priceCurrency' => 'EUR']]],
        ['amount' => '3', 'currency' => 'EUR'],
    ],
    'no currency' => [['@type' => 'Product', 'offers' => ['price' => '3']], ['amount' => '3', 'currency' => null]],
    'no offer' => [['@type' => 'Product', 'name' => 'A pan'], null],
    'a price that is not one' => [['@type' => 'Product', 'offers' => ['price' => 'ask us']], null],
]);
