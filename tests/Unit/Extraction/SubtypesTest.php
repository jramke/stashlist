<?php

declare(strict_types=1);

use App\Extraction\Subtypes;

test('some sites are one kind of thing, their subdomains too', function (string $domain, string $expected) {
    expect(Subtypes::of($domain, null, []))->toBe($expected);
})->with([
    'youtube' => ['youtube.com', 'video'],
    'a youtube subdomain' => ['m.youtube.com', 'video'],
    'a short youtube link' => ['youtu.be', 'video'],
    'vimeo' => ['vimeo.com', 'video'],
    'x' => ['x.com', 'social'],
    'twitter' => ['twitter.com', 'social'],
    'bluesky' => ['bsky.app', 'social'],
    'reddit' => ['old.reddit.com', 'social'],
    'arxiv' => ['arxiv.org', 'paper'],
    'a doi' => ['doi.org', 'paper'],
    'github' => ['github.com', 'repo'],
    'gitlab' => ['gitlab.com', 'repo'],
    'codeberg' => ['codeberg.org', 'repo'],
]);

test('a site that merely ends in the same letters is not that site', function (string $domain) {
    expect(Subtypes::of($domain, null, []))->toBeNull();
})->with([
    'notyoutube.com',
    'fakex.com',
    'github.com.evil.example',
    'docs.github.com',
    'gist.github.com',
    'example.com',
]);

test('the schema.org types decide the rest, the most specific kind first', function (array $types, ?string $expected) {
    expect(Subtypes::of('shop.example', null, $types))->toBe($expected);
})->with([
    'a product' => [['product'], 'product'],
    'a product with an article on it' => [['article', 'product', 'organization'], 'product'],
    'a recipe' => [['recipe', 'breadcrumblist'], 'recipe'],
    'a paper is an article too' => [['scholarlyarticle', 'article'], 'paper'],
    'a post' => [['socialmediaposting'], 'social'],
    'an article' => [['newsarticle'], 'article'],
    'a blog post' => [['blogposting', 'person'], 'article'],
    'an article with a video in it' => [['article', 'videoobject'], 'article'],
    'a video' => [['videoobject'], 'video'],
    'a quote' => [['quotation'], 'quote'],
    'only things that say nothing' => [['website', 'organization', 'breadcrumblist', 'webpage'], null],
    'nothing' => [[], null],
]);

test('Open Graph is the last word, and only for the kinds it names', function (?string $type, ?string $expected) {
    expect(Subtypes::of('shop.example', $type, []))->toBe($expected);
})->with([
    'a video' => ['video.other', 'video'],
    'a movie' => ['video.movie', 'video'],
    'a product' => ['product', 'product'],
    'a product group' => ['product.group', 'product'],
    'an article' => ['article', 'article'],
    'upper case' => ['Article', 'article'],
    'a website' => ['website', null],
    'music' => ['music.song', null],
    'nothing' => [null, null],
]);

test('the site comes before the page, the page before Open Graph', function () {
    expect(Subtypes::of('github.com', 'article', ['product']))
        ->toBe('repo')
        ->and(Subtypes::of('shop.example', 'article', ['product']))
        ->toBe('product')
        ->and(Subtypes::of('shop.example', 'article', ['website']))
        ->toBe('article');
});
