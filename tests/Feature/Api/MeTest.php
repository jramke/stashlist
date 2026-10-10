<?php

declare(strict_types=1);

use App\Enums\TokenAbility;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create(['name' => 'Ada', 'ai_enabled' => false]);
    $this->token = $this->user->createToken('test', TokenAbility::values())->plainTextToken;
});

test('without a token the API answers 401 as JSON', function () {
    $this->getJson('/api/v1/me')->assertUnauthorized()->assertJson(['message' => 'Unauthenticated.']);
    $this->withToken('stl_not-a-real-token')->getJson('/api/v1/me')->assertUnauthorized();
});

test('a session cookie is not an API credential', function () {
    $this->actingAs($this->user)->getJson('/api/v1/me')->assertUnauthorized();
});

test('the token says who it belongs to and what the API accepts', function () {
    $this
        ->withToken($this->token)
        ->getJson('/api/v1/me')
        ->assertOk()
        ->assertExactJson([
            'name' => 'Ada',
            'ai_enabled' => false,
            'limits' => [
                'creates_per_minute' => 60,
                'lookups_per_minute' => 120,
                'content_markdown_bytes' => 200_000,
                'screenshot_bytes' => 2 * 1024 * 1024,
                'image_bytes' => 20 * 1024 * 1024,
            ],
        ]);
});

test('using a token marks it as used', function () {
    expect($this->user->tokens()->sole()->last_used_at)->toBeNull();

    $this->withToken($this->token)->getJson('/api/v1/me');

    expect($this->user->tokens()->sole()->last_used_at)->not->toBeNull();
});

test('the API is limited per token', function () {
    $other = User::factory()->create()->createToken('other', TokenAbility::values())->plainTextToken;
    config(['stashlist.api.lookups_per_minute' => 2]);

    $this->withToken($this->token)->getJson('/api/v1/me')->assertOk();
    $this->withToken($this->token)->getJson('/api/v1/me')->assertOk();
    $this->withToken($this->token)->getJson('/api/v1/me')->assertTooManyRequests();

    // The other token has its own allowance (a new request: the guard of this test remembers the last user).
    app('auth')->forgetGuards();
    $this->withToken($other)->getJson('/api/v1/me')->assertOk();
});
