<?php

declare(strict_types=1);

use App\Models\Collection;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('guests share the app name, no user and no collections', function () {
    $this->get(route('home'))->assertInertia(
        fn (AssertableInertia $page) => $page
            ->where('name', config('app.name'))
            ->where('auth.user', null)
            ->where('collections', []),
    );
});

test('authenticated users share only the fields declared in UserData', function () {
    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->get(route('profile.edit'))
        ->assertInertia(fn (AssertableInertia $page) => $page->where('auth.user', [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
        ]));
});

test('authenticated users share their own collections in order', function () {
    $user = User::factory()->create();
    Collection::factory()->for($user)->create(['name' => 'Second', 'position' => 2]);
    Collection::factory()->for($user)->create(['name' => 'First', 'position' => 1]);
    Collection::factory()->create(['name' => 'Somebody else']);

    $this
        ->actingAs($user)
        ->get(route('profile.edit'))
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->has('collections', 2)
                ->where('collections.0.name', 'First')
                ->where('collections.1.name', 'Second'),
        );
});
