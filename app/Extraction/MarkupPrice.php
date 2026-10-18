<?php

declare(strict_types=1);

namespace App\Extraction;

use Dom\HTMLDocument;

/**
 * The price a page gives in its markup rather than in JSON-LD: Open Graph (`product:price:amount`) or the
 * microdata of a shop (`itemprop="price"`).
 */
final class MarkupPrice
{
    public static function of(HTMLDocument $document): ?Price
    {
        return Price::tryFrom(
            self::content(
                $document,
                'meta[property="product:price:amount"], meta[property="og:price:amount"]',
            ) ?? self::content($document, '[itemprop="price"]'),
            self::content(
                $document,
                'meta[property="product:price:currency"], meta[property="og:price:currency"]',
            ) ?? self::content($document, '[itemprop="priceCurrency"]'),
        );
    }

    private static function content(HTMLDocument $document, string $selector): ?string
    {
        $element = $document->querySelector($selector);
        $value = $element?->getAttribute('content') ?? $element?->textContent;

        return $value === null || trim($value) === '' ? null : trim($value);
    }
}
