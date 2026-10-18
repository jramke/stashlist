<?php

declare(strict_types=1);

use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('the playground is closed unless it is switched on', function () {
    $user = User::factory()->create();

    config(['stashlist.playground' => false]);

    $this->actingAs($user)->get('/playground/cards')->assertNotFound();
    $this->actingAs($user)->get('/playground/art')->assertNotFound();
});

test('a guest never reaches the playground', function () {
    config(['stashlist.playground' => true]);

    $this->get('/playground/cards')->assertRedirect('/login');
});

test('the playground page and its pictures work when it is on', function () {
    $user = User::factory()->create();

    config(['stashlist.playground' => true]);

    $this
        ->actingAs($user)
        ->get('/playground/cards')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->component('playground/cards'));

    $art = $this->actingAs($user)->get('/playground/art?w=320&h=200&hue=120');

    $art->assertOk()->assertHeader('Content-Type', 'image/svg+xml');
    expect($art->getContent())->toContain('width="320"')->and($art->getContent())->toContain('320×200');
});

test('a picture can be made to fail, and its size is kept sane', function () {
    $user = User::factory()->create();

    config(['stashlist.playground' => true]);

    $this->actingAs($user)->get('/playground/art?status=404')->assertNotFound();
    $this->actingAs($user)->get('/playground/art?status=500')->assertInternalServerError();
    // Anything else is a picture.
    $this->actingAs($user)->get('/playground/art?status=302')->assertOk();

    $huge = $this->actingAs($user)->get('/playground/art?w=999999&h=1');

    expect($huge->getContent())->toContain('width="2400"')->and($huge->getContent())->toContain('height="16"');
});
