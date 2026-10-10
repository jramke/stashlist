<?php

declare(strict_types=1);

use App\Enums\TokenAbility;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Laravel\Sanctum\PersonalAccessToken;

beforeEach(function () {
    $this->user = User::factory()->create();
});

test('guests are sent to the login page', function () {
    $this->get('/settings/tokens')->assertRedirect('/login');
    $this->post('/settings/tokens', ['name' => 'x'])->assertRedirect('/login');
});

test('the page lists my tokens without their secrets and nobody else\'s', function () {
    $this->user->createToken('Chrome on my MacBook', TokenAbility::values());
    User::factory()->create()->createToken('Somebody else', TokenAbility::values());

    $this
        ->actingAs($this->user)
        ->get('/settings/tokens')
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('settings/tokens')
                ->has('tokens', 1)
                ->where('tokens.0.name', 'Chrome on my MacBook')
                ->where('tokens.0.abilities', ['stash:create', 'stash:read', 'stash:search'])
                ->where('tokens.0.last_used_at', null)
                ->missing('tokens.0.token'),
        );
});

test('a new token is shown once, in plain text, and stored hashed', function () {
    $response = $this
        ->actingAs($this->user)
        ->followingRedirects()
        ->from('/settings/tokens')
        ->post('/settings/tokens', ['name' => 'Raycast']);

    $shown = $response->viewData('page')['flash']['new_token'];
    $record = $this->user->tokens()->sole();
    [$id, $secret] = explode('|', $shown->token, 2);

    expect($shown->name)
        ->toBe('Raycast')
        ->and($shown->token)
        ->toMatch('/^\d+\|stl_[A-Za-z0-9]+$/')
        ->and((int)$id)
        ->toBe($record->id)
        ->and($record->name)
        ->toBe('Raycast')
        ->and($record->abilities)
        ->toBe(TokenAbility::values())
        ->and($record->token)
        ->toBe(hash('sha256', $secret));

    // The list shows the token without its secret, and the next visit does not show it again.
    $this
        ->actingAs($this->user)
        ->get('/settings/tokens')
        ->assertInertia(fn (AssertableInertia $page) => $page->has('tokens', 1)->missing('tokens.0.token'));
    expect($this->actingAs($this->user)->get('/settings/tokens')->viewData('page'))->not->toHaveKey('flash');
});

test('a token needs a name and there is a limit', function () {
    config(['stashlist.api.max_tokens_per_user' => 2]);

    $this->actingAs($this->user)->post('/settings/tokens', ['name' => ''])->assertSessionHasErrors('name');

    $this->actingAs($this->user)->post('/settings/tokens', ['name' => 'one']);
    $this->actingAs($this->user)->post('/settings/tokens', ['name' => 'two']);
    $this->actingAs($this->user)->post('/settings/tokens', ['name' => 'three'])->assertSessionHasErrors('name');

    expect($this->user->tokens()->count())->toBe(2);
});

test('revoking a token ends its access', function () {
    $plain = $this->user->createToken('Chrome', TokenAbility::values())->plainTextToken;
    $this->withToken($plain)->getJson('/api/v1/me')->assertOk();

    $id = $this->user->tokens()->sole()->id;
    $this->actingAs($this->user)->delete("/settings/tokens/{$id}")->assertRedirect('/settings/tokens');

    expect(PersonalAccessToken::query()->count())->toBe(0);

    // A fresh request: the guard of this test keeps the user it resolved before.
    app('auth')->forgetGuards();
    $this->withToken($plain)->getJson('/api/v1/me')->assertUnauthorized();
});

test('someone else\'s token cannot be revoked', function () {
    $theirs = User::factory()->create()->createToken('theirs', TokenAbility::values())->accessToken;

    $this->actingAs($this->user)->delete("/settings/tokens/{$theirs->id}")->assertNotFound();

    expect(PersonalAccessToken::query()->count())->toBe(1);
});
