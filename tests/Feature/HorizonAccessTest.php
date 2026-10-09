<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Gate;

beforeEach(function () {
    config(['stashlist.admins' => ['admin@example.com']]);
});

test('horizon is closed to guests', function () {
    expect(Gate::allows('viewHorizon'))->toBeFalse();

    $this->get('/horizon')->assertForbidden();
});

test('horizon is closed to users who are not admins', function () {
    $user = User::factory()->create(['email' => 'user@example.com']);

    expect(Gate::forUser($user)->allows('viewHorizon'))->toBeFalse();

    $this->actingAs($user)->get('/horizon')->assertForbidden();
});

test('horizon is open to the emails in STASHLIST_ADMINS', function () {
    $admin = User::factory()->create(['email' => 'admin@example.com']);

    expect(Gate::forUser($admin)->allows('viewHorizon'))->toBeTrue();
});
