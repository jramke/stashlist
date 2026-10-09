<?php

declare(strict_types=1);

use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('guests share the app name and no user', function () {
    $this->get(route('home'))->assertInertia(
        fn (AssertableInertia $page) => $page->where('name', config('app.name'))->where('auth.user', null),
    );
});

test('authenticated users share only the fields declared in UserData', function () {
    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->get(route('home'))
        ->assertInertia(fn (AssertableInertia $page) => $page->where('auth.user', [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
        ]));
});
