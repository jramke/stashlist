<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Gate;

beforeEach(function () {
    config(['stashlist.admins' => ['admin@example.com']]);
});

test('horizon and pulse are closed to guests', function (string $path, string $ability) {
    expect(Gate::allows($ability))->toBeFalse();

    $this->get($path)->assertForbidden();
})->with([
    'horizon' => ['/horizon', 'viewHorizon'],
    'pulse' => ['/pulse', 'viewPulse'],
]);

test('horizon and pulse are closed to users who are not admins', function (string $path, string $ability) {
    $user = User::factory()->create(['email' => 'user@example.com']);

    expect(Gate::forUser($user)->allows($ability))->toBeFalse();

    $this->actingAs($user)->get($path)->assertForbidden();
})->with([
    'horizon' => ['/horizon', 'viewHorizon'],
    'pulse' => ['/pulse', 'viewPulse'],
]);

test('horizon and pulse are open to the verified emails in STASHLIST_ADMINS', function (string $ability) {
    $admin = User::factory()->create(['email' => 'Admin@Example.com']);

    expect($admin->isAdmin())->toBeTrue()->and(Gate::forUser($admin)->allows($ability))->toBeTrue();
})->with(['viewHorizon', 'viewPulse']);

test('an admin email nobody has verified is no admin, because anyone can register it', function (string $ability) {
    $impostor = User::factory()->unverified()->create(['email' => 'admin@example.com']);

    expect($impostor->isAdmin())->toBeFalse()->and(Gate::forUser($impostor)->allows($ability))->toBeFalse();
})->with(['viewHorizon', 'viewPulse']);

test('an admin gets the pulse dashboard', function () {
    $admin = User::factory()->create(['email' => 'admin@example.com']);

    $this->actingAs($admin)->get('/pulse')->assertOk();
});

test('pulse is open on a local machine', function () {
    $this->app['env'] = 'local';

    expect(Gate::allows('viewPulse'))->toBeTrue();
});

test('pulse does not ask Gravatar for the users it lists', function () {
    $user = User::factory()->create(['name' => 'Ada', 'email' => 'ada@example.com']);

    $shown = Laravel\Pulse\Facades\Pulse::resolveUsers(collect([$user->id]))
        ->find($user->id);

    expect($shown->name)
        ->toBe('Ada')
        ->and($shown->extra)
        ->toBe('ada@example.com')
        ->and($shown)
        ->not->toHaveProperty('avatar');
});
