<?php

declare(strict_types=1);

namespace App\Extraction;

/**
 * Decides by rule what kind of page a link is (the subtype), from what the page says about itself and from where it
 * lives, before any model is asked. The model only fills what this leaves open.
 *
 * In this order: the site (a few sites are one kind of thing), the schema.org types of the page, its Open Graph
 * type. Null when the page does not say.
 */
final class Subtypes
{
    /** Exact hosts: github.com is a repository, gist.github.com and docs.github.com are not. */
    private const REPOSITORY_HOSTS = ['github.com', 'gitlab.com', 'codeberg.org', 'bitbucket.org'];

    /** These hosts and their subdomains (m.youtube.com). */
    private const SITES = [
        'video' => ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com', 'twitch.tv', 'tiktok.com'],
        'social' => [
            'x.com',
            'twitter.com',
            'bsky.app',
            'threads.net',
            'mastodon.social',
            'reddit.com',
            'linkedin.com',
            'instagram.com',
            'facebook.com',
        ],
        'paper' => [
            'arxiv.org',
            'doi.org',
            'openreview.net',
            'semanticscholar.org',
            'biorxiv.org',
            'medrxiv.org',
            'ssrn.com',
            'pubmed.ncbi.nlm.nih.gov',
            'researchgate.net',
        ],
    ];

    /** The kinds, most specific first: a product page that also has an article on it is a product. */
    private const SCHEMA_TYPES = [
        'product' => ['product', 'individualproduct', 'productmodel', 'productgroup'],
        'recipe' => ['recipe'],
        'paper' => ['scholarlyarticle', 'medicalscholarlyarticle'],
        'social' => ['socialmediaposting', 'discussionforumposting'],
        'article' => [
            'article',
            'newsarticle',
            'blogposting',
            'techarticle',
            'report',
            'analysisnewsarticle',
            'opinionnewsarticle',
            'reportagenewsarticle',
            'reviewnewsarticle',
            'liveblogposting',
        ],
        'video' => ['videoobject', 'clip', 'movie', 'tvepisode'],
        'repo' => ['softwaresourcecode'],
        'quote' => ['quotation'],
    ];

    /**
     * @param  list<string>  $schemaTypes  lower case, as StructuredData::types() gives them
     */
    public static function of(?string $domain, ?string $openGraphType, array $schemaTypes): ?string
    {
        return self::bySite($domain) ?? self::bySchema($schemaTypes) ?? self::byOpenGraph($openGraphType);
    }

    private static function bySite(?string $domain): ?string
    {
        if ($domain === null || $domain === '') {
            return null;
        }

        if (in_array($domain, self::REPOSITORY_HOSTS, strict: true)) {
            return 'repo';
        }

        foreach (self::SITES as $subtype => $hosts) {
            foreach ($hosts as $host) {
                if ($domain === $host || str_ends_with($domain, ".{$host}")) {
                    return $subtype;
                }
            }
        }

        return null;
    }

    /**
     * @param  list<string>  $types
     */
    private static function bySchema(array $types): ?string
    {
        foreach (self::SCHEMA_TYPES as $subtype => $known) {
            if (array_intersect($known, $types) !== []) {
                return $subtype;
            }
        }

        return null;
    }

    private static function byOpenGraph(?string $type): ?string
    {
        $type = strtolower($type ?? '');

        return match (true) {
            str_starts_with($type, 'video') => 'video',
            str_starts_with($type, 'product') => 'product',
            str_starts_with($type, 'article') => 'article',
            default => null,
        };
    }
}
