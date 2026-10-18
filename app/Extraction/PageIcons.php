<?php

declare(strict_types=1);

namespace App\Extraction;

use Dom\Element;
use Dom\HTMLDocument;

/**
 * Where a page says its icons are, best first: the touch icons (large, made for a home screen) before the small
 * ones, the larger before the smaller. An SVG comes after every picture: it is only wanted from a site that has no
 * other icon, and it is never read as it came, `FaviconProcessor` draws it from a plain copy it makes.
 */
final class PageIcons
{
    private const MAX = 4;

    /**
     * @return list<string>
     */
    public static function of(HTMLDocument $document, string $base): array
    {
        $found = [];

        foreach ($document->querySelectorAll(
            'link[rel~="icon"][href], link[rel~="apple-touch-icon"][href], link[rel~="apple-touch-icon-precomposed"][href]',
        ) as $link) {
            $url = $link instanceof Element ? AbsoluteUrl::of($base, $link->getAttribute('href')) : null;

            if ($link instanceof Element && $url !== null) {
                $found[] = [
                    'url' => $url,
                    'picture' => ! self::isSvg($url, $link),
                    'touch' => str_contains((string)$link->getAttribute('rel'), 'apple-touch'),
                    'size' => self::size($link),
                ];
            }
        }

        // Stable: icons that tie keep the order of the page.
        usort(
            $found,
            static fn (array $a, array $b): int => (
                [$b['picture'], $b['touch'], $b['size']] <=> [$a['picture'], $a['touch'], $a['size']]
            ),
        );

        return array_slice(array_values(array_unique(array_column($found, 'url'))), offset: 0, length: self::MAX);
    }

    private static function isSvg(string $url, Element $link): bool
    {
        return (
            str_ends_with(strtolower((string)parse_url($url, PHP_URL_PATH)), '.svg') ||
            str_contains(strtolower((string)$link->getAttribute('type')), 'svg')
        );
    }

    /**
     * The largest side a `sizes="16x16 32x32"` attribute declares, or 0.
     */
    private static function size(Element $link): int
    {
        $sizes = [];
        preg_match_all('/(\d+)x\d+/i', (string)$link->getAttribute('sizes'), $sizes);

        return $sizes[1] === [] ? 0 : max(array_map(intval(...), $sizes[1]));
    }
}
