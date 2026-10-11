<?php

declare(strict_types=1);

use App\Models\User;
use Inertia\Testing\AssertableInertia;

const CHROME_REDIRECT = 'https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/';

const STATE = 'a1b2c3d4e5f6g7h8i9j0';

beforeEach(function () {
    $this->user = User::factory()->create();
});

test('a guest is sent to sign in and comes back to the question', function () {
    $this->get('/connect/extension?redirect_uri='.urlencode(CHROME_REDIRECT).'&state='.STATE)->assertRedirect('/login');
});

test('the page asks before anything is made', function () {
    $this
        ->actingAs($this->user)
        ->get('/connect/extension?redirect_uri='.urlencode(CHROME_REDIRECT).'&state='.STATE)
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('connect/extension')
                ->where('browser', 'Chrome')
                ->where('state', STATE),
        );

    expect($this->user->tokens()->count())->toBe(0);
});

test('approving makes a token and sends it to the extension in the fragment', function () {
    $response = $this->actingAs($this->user)->post('/connect/extension', [
        'redirect_uri' => CHROME_REDIRECT,
        'state' => STATE,
    ]);

    $location = $response->headers->get('X-Inertia-Location') ?? $response->headers->get('Location');
    expect($response->status())
        ->toBeIn([302, 409])
        ->and($location)
        ->toStartWith(CHROME_REDIRECT.'#token=');

    parse_str((string)parse_url((string)$location, PHP_URL_FRAGMENT), $fragment);
    expect($fragment['state'])->toBe(STATE)->and($this->user->tokens()->count())->toBe(1);
    expect($this->user->tokens()->first()->name)->toBe('Chrome extension');

    app('auth')->forgetGuards();
    $this->withToken($fragment['token'])->getJson('/api/v1/me')->assertOk();
});

test('cancelling sends an error and makes no token', function () {
    $response = $this->actingAs($this->user)->post('/connect/extension/deny', [
        'redirect_uri' => 'https://abcdefghijklmnopabcdefghijklmnop.extensions.allizom.org/cb',
        'state' => STATE,
    ]);

    $location = $response->headers->get('X-Inertia-Location') ?? $response->headers->get('Location');
    expect($location)->toContain('#error=denied')->and($this->user->tokens()->count())->toBe(0);
});

test('a token only goes to the address a browser gives an extension', function (string $redirect) {
    $this
        ->actingAs($this->user)
        ->post('/connect/extension', ['redirect_uri' => $redirect, 'state' => STATE])
        ->assertSessionHasErrors('redirect_uri');

    expect($this->user->tokens()->count())->toBe(0);
})->with([
    'another site' => 'https://evil.example/',
    'a lookalike' => 'https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org.evil.example/',
    'plain http' => 'http://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/',
    'credentials' => 'https://x@abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/',
    'a short id' => 'https://abc.chromiumapp.org/',
]);

test('a short state is refused', function () {
    $this
        ->actingAs($this->user)
        ->post('/connect/extension', ['redirect_uri' => CHROME_REDIRECT, 'state' => 'abc'])
        ->assertSessionHasErrors('state');
});
