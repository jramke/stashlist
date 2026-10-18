<?php

declare(strict_types=1);

namespace App\Extraction;

use Dom\HTMLDocument;
use GuzzleHttp\Psr7\Uri;
use GuzzleHttp\Psr7\UriResolver;
use InvalidArgumentException;

/**
 * Reads the metadata of a fetched HTML page (Open Graph, Twitter cards, plain meta tags, icons) and its
 * readable text. The HTML is untrusted: it is only ever read, never rendered.
 */
final class PageParser
{
    public function parse(FetchedResponse $response): ParsedPage
    {
        $html = HtmlDecoder::toUtf8($response);
        $document = HTMLDocument::createFromString($html, LIBXML_NOERROR, overrideEncoding: 'UTF-8');
        $structured = JsonLd::fromPage($document);

        return new ParsedPage(
            title: $this->limit($this->meta($document, 'og:title', 'twitter:title') ?? $document->title, 500),
            description: $this->limit(
                $this->meta($document, 'og:description', 'twitter:description', 'description'),
                1000,
            ),
            siteName: $this->limit($this->meta($document, 'og:site_name'), 200),
            imageUrl: $this->absolute(
                $response->url,
                $this->meta($document, 'og:image', 'og:image:secure_url', 'twitter:image'),
            ),
            faviconUrl: $this->absolute($response->url, $this->icon($document) ?? '/favicon.ico'),
            language: $this->language($document),
            openGraphType: $this->limit($this->meta($document, 'og:type'), 50),
            text: ReadableText::from($html),
            schemaTypes: $structured->types(),
            price: Offers::priceIn($structured->nodes) ?? MarkupPrice::of($document),
        );
    }

    /**
     * The content of the first meta tag found, looking for each name in order. Open Graph uses `property`,
     * Twitter and plain meta tags use `name`.
     */
    private function meta(HTMLDocument $document, string ...$names): ?string
    {
        foreach ($names as $name) {
            $content = $document
                ->querySelector("meta[property=\"{$name}\"], meta[name=\"{$name}\"]")
                ?->getAttribute('content');

            if ($content !== null && trim($content) !== '') {
                return trim($content);
            }
        }

        return null;
    }

    private function icon(HTMLDocument $document): ?string
    {
        return $document->querySelector('link[rel~="icon"][href]')?->getAttribute('href');
    }

    private function language(HTMLDocument $document): ?string
    {
        $lang = $document->documentElement?->getAttribute('lang');

        return $lang !== null && preg_match('/^[a-z]{2}/i', $lang) === 1
            ? strtolower(substr($lang, offset: 0, length: 2))
            : null;
    }

    /**
     * An absolute http(s) URL, resolved against the page, or null.
     */
    private function absolute(string $base, ?string $reference): ?string
    {
        if ($reference === null || trim($reference) === '') {
            return null;
        }

        try {
            $url = (string)UriResolver::resolve(new Uri($base), new Uri(trim($reference)));
        } catch (InvalidArgumentException) {
            return null;
        }

        return preg_match('#^https?://#i', $url) === 1 ? $url : null;
    }

    private function limit(?string $value, int $characters): ?string
    {
        return $value === null || $value === '' ? null : mb_substr($value, start: 0, length: $characters);
    }
}
