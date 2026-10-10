<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Response;

/**
 * robots.txt and the sitemap: what search engines may read, and the pages that are for them. Built from the
 * installation's own address, which a static file cannot know.
 */
final class SearchEngineFilesController extends Controller
{
    /** The public pages, by route name. */
    private const PAGES = ['home', 'pricing', 'extension', 'docs', 'privacy', 'terms', 'imprint', 'changelog'];

    public function sitemap(): Response
    {
        $pages = self::PAGES;

        if (config()->boolean('stashlist.site.compare_page')) {
            $pages[] = 'compare';
        }

        $urls = implode('', array_map(
            static fn (string $name): string => '<url><loc>'.e(route($name)).'</loc></url>',
            $pages,
        ));

        return response(
            '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'.
            $urls.
            '</urlset>',
            status: 200,
            headers: ['Content-Type' => 'application/xml'],
        );
    }

    public function robots(): Response
    {
        return response(
            "User-agent: *\nAllow: /\nDisallow: /stashes\nDisallow: /settings\nDisallow: /collections\nDisallow: /tags\nDisallow: /api\n\nSitemap: ".
            route('sitemap').
            "\n",
            status: 200,
            headers: ['Content-Type' => 'text/plain'],
        );
    }
}
