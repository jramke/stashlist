<?php

declare(strict_types=1);

use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('a guest who asks for the shortcuts signs in first', function () {
    $this->get('/shortcuts')->assertRedirect('/login');
});

test('a signed-in user gets the shortcuts page', function () {
    $this
        ->actingAs(User::factory()->create())
        ->get('/shortcuts')
        ->assertInertia(fn (AssertableInertia $page) => $page->component('shortcuts'));
});
