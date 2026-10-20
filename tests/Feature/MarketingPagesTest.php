<?php

declare(strict_types=1);

use App\Marketing\Changelog;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('a guest sees the front page, a signed-in person is sent to their stashes', function () {
    $this
        ->get('/')
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('marketing/home')
                ->has('marketing'),
        );

    $this->actingAs(User::factory()->create())->get('/')->assertRedirect(route('stashes.index'));
});

test('every public page opens for everyone', function (string $path, string $component) {
    $this
        ->get($path)
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component($component)
                ->has('marketing'),
        );

    $this->actingAs(User::factory()->create())->get($path)->assertOk();
})->with([
    ['/pricing',   'marketing/pricing'],
    ['/extension', 'marketing/extension'],
    ['/docs',      'marketing/docs'],
    ['/terms',     'marketing/terms'],
    ['/imprint',   'marketing/imprint'],
    ['/changelog', 'marketing/changelog'],
    ['/privacy',   'marketing/privacy'],
]);

test('the pages know whether people can join and whether paid plans can be bought', function () {
    config(['stashlist.registration' => 'open', 'stashlist.site.billing' => 'none']);
    $this->get('/pricing')->assertInertia(
        fn (AssertableInertia $page) => $page
            ->where('marketing.registration', 'open')
            ->where('marketing.billing', false),
    );

    config(['stashlist.registration' => 'closed', 'stashlist.site.billing' => 'polar']);
    User::factory()->create();
    $this->get('/pricing')->assertInertia(
        fn (AssertableInertia $page) => $page
            ->where('marketing.registration', 'closed')
            ->where('marketing.billing', true),
    );
});

test('the imprint and the terms are given the details of the operator', function () {
    config([
        'stashlist.operator.name' => 'Example Ltd',
        'stashlist.operator.vat_id' => 'DE123456789',
    ]);

    $this->get('/imprint')->assertInertia(
        fn (AssertableInertia $page) => $page
            ->where('operator.name', 'Example Ltd')
            ->where('operator.vat_id', 'DE123456789'),
    );
    $this->get('/terms')->assertInertia(fn (AssertableInertia $page) => $page->where('operator.name', 'Example Ltd'));
});

test('the comparison page is off until the operator has checked it and turns it on', function () {
    $this->get('/mymind-alternative')->assertNotFound();

    config(['stashlist.site.compare_page' => true]);

    $this
        ->get('/mymind-alternative')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->component('marketing/compare'));
});

test('the sitemap lists the public pages and the comparison page only when it is published', function () {
    $without = $this->get('/sitemap.xml');

    $without->assertOk()->assertHeader('Content-Type', 'application/xml');
    expect($without->getContent())
        ->toContain('<loc>'.url('/pricing').'</loc>')
        ->toContain('<loc>'.url('/privacy').'</loc>')
        ->toContain('<loc>'.url('/').'</loc>')
        ->not->toContain('mymind-alternative')
        ->not->toContain('/stashes');

    config(['stashlist.site.compare_page' => true]);

    expect($this->get('/sitemap.xml')->getContent())->toContain('mymind-alternative');
});

test('robots.txt keeps crawlers out of the app and points at the sitemap', function () {
    $robots = $this->get('/robots.txt');

    $robots->assertOk();
    expect($robots->getContent())
        ->toContain('Disallow: /stashes')
        ->toContain('Disallow: /settings')
        ->toContain('Sitemap: '.url('/sitemap.xml'));
});

test('the changelog is read from CHANGELOG.md', function () {
    $path = tempnam(sys_get_temp_dir(), 'changelog');
    file_put_contents(
        $path,
        "# Changelog\n\n## Unreleased\n\n- First thing\n- Second thing\n\n## [1.2.0] - 2026-10-12\n\n* Older\n",
    );

    expect(Changelog::entries($path))->toBe([
        ['version' => 'Unreleased', 'date' => null, 'notes' => ['First thing', 'Second thing']],
        ['version' => '1.2.0', 'date' => '2026-10-12', 'notes' => ['Older']],
    ]);
    expect(Changelog::entries('/does/not/exist.md'))->toBeEmpty();

    $this->get('/changelog')->assertInertia(fn (AssertableInertia $page) => $page->has('entries'));
});

test('the analytics script is on the page only when it is set up', function () {
    $this->get('/')->assertDontSee('data-website-id', escape: false);

    config(['services.umami.script' => 'https://stats.example/script.js', 'services.umami.website_id' => 'abc-123']);

    $this->get('/')->assertSee('src="https://stats.example/script.js" data-website-id="abc-123"', escape: false);
});

test('the front page is also at /homepage, for people who are signed in too', function () {
    $this->get('/homepage')->assertInertia(fn (AssertableInertia $page) => $page->component('marketing/home'));

    $this
        ->actingAs(User::factory()->create())
        ->get('/homepage')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->component('marketing/home'));
});
