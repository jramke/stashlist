<?php

declare(strict_types=1);

use App\Models\Stash;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('a guest who shares something signs in first and is brought back', function () {
    $this->get('/share?url=https://example.com')->assertRedirect('/login');
    expect(session('url.intended'))->toContain('/share?url=');
});

test('sharing opens the feed with the link in the capture box and saves nothing', function () {
    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->get('/share?title=Hi&text=Look+https://example.com/a&url=')
        ->assertRedirect('/stashes?share=https%3A%2F%2Fexample.com%2Fa');

    $this->get('/stashes?share=https://example.com/a')->assertInertia(
        fn (AssertableInertia $page) => $page->where('share', 'https://example.com/a'),
    );
    expect(Stash::query()->count())->toBe(0);
});

test('sharing nothing opens the plain feed', function () {
    $this->actingAs(User::factory()->create())->get('/share')->assertRedirect('/stashes');
});

test('the app can be installed: manifest, icons and the share target are served', function () {
    $manifest = json_decode(
        (string)file_get_contents(public_path('manifest.json')),
        true,
        flags: JSON_THROW_ON_ERROR,
    );

    expect($manifest['display'])->toBe('standalone')->and($manifest['share_target']['action'])->toBe('/share');

    foreach ($manifest['icons'] as $icon) {
        expect(public_path($icon['src']))->toBeFile();
    }

    $this->get('/pricing')->assertSee('rel="manifest" href="/manifest.json"', false);
});
