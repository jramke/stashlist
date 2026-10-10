<?php

declare(strict_types=1);

use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('guests are sent to the login page', function () {
    $this->patch('/settings/smart-features', ['ai_enabled' => false])->assertRedirect('/login');
});

test('smart features are on for a new account', function () {
    $user = User::factory()->create();

    expect($user->fresh()->ai_enabled)->toBeTrue();

    $this
        ->actingAs($user)
        ->get('/settings/profile')
        ->assertInertia(fn (AssertableInertia $page) => $page->where('auth.user.ai_enabled', true));
});

test('the switch is a setting of the account and can be turned off and on again', function () {
    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->followingRedirects()
        ->patch('/settings/smart-features', ['ai_enabled' => false])
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('settings/profile')
                ->where('auth.user.ai_enabled', false)
                ->hasFlash('toast', ['type' => 'success', 'message' => 'Saved.', 'undo_url' => null]),
        );

    expect($user->fresh()->ai_enabled)->toBeFalse();

    $this
        ->actingAs($user)
        ->patch('/settings/smart-features', ['ai_enabled' => true])
        ->assertRedirect('/settings/profile');

    expect($user->fresh()->ai_enabled)->toBeTrue();
});

test('it needs a yes or a no', function (array $data) {
    $user = User::factory()->create();

    $this->actingAs($user)->patch('/settings/smart-features', $data)->assertSessionHasErrors('ai_enabled');

    expect($user->fresh()->ai_enabled)->toBeTrue();
})->with([
    'nothing' => [[]],
    'maybe' => [['ai_enabled' => 'maybe']],
]);

test('it changes the account of the person signed in and nobody else\'s', function () {
    $me = User::factory()->create();
    $other = User::factory()->create();

    $this->actingAs($me)->patch('/settings/smart-features', ['ai_enabled' => false]);

    expect($me->fresh()->ai_enabled)->toBeFalse()->and($other->fresh()->ai_enabled)->toBeTrue();
});
