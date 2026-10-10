<?php

declare(strict_types=1);

use App\Auth\Invitations;
use App\Models\Invitation;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

/**
 * @param  array<string, string>  $extra
 */
function register_as(string $email, array $extra = []): Illuminate\Testing\TestResponse
{
    return test()->post(route('register.store'), [
        'name' => 'Test User',
        'email' => $email,
        'password' => 'password',
        'password_confirmation' => 'password',
        ...$extra,
    ]);
}

test('open registration lets anyone in', function () {
    config(['stashlist.registration' => 'open']);
    User::factory()->create();

    register_as('new@example.com')->assertRedirect();

    expect(User::query()->where('email', 'new@example.com')->exists())->toBeTrue();
});

test('closed registration lets nobody new in, and says so on the page and on submit', function () {
    config(['stashlist.registration' => 'closed']);
    User::factory()->create();

    $this->get(route('register'))->assertInertia(
        fn (AssertableInertia $page) => $page
            ->component('auth/register')
            ->where('registration', 'closed'),
    );

    register_as('new@example.com')->assertSessionHasErrors(['email' => 'Registration is closed.']);
    $this->assertGuest();
    expect(User::query()->where('email', 'new@example.com')->exists())->toBeFalse();
});

test('a new installation lets the first account in even when registration is closed', function () {
    config(['stashlist.registration' => 'closed']);

    $this->get(route('register'))->assertInertia(
        fn (AssertableInertia $page) => $page->where('registration', 'closed'),
    );
    expect(User::query()->count())->toBe(0);
});

test('invite-only registration needs a valid code', function () {
    config(['stashlist.registration' => 'invite']);
    User::factory()->create();

    register_as('new@example.com')->assertSessionHasErrors(['email' => 'You need an invitation to register.']);
    register_as('new@example.com', ['invite' => 'nonsense'])->assertSessionHasErrors('email');

    expect(User::query()->count())->toBe(1);
});

test('an invitation lets one person in, once', function () {
    config(['stashlist.registration' => 'invite']);
    User::factory()->create();
    $invitation = app(Invitations::class)->create();

    register_as('first@example.com', ['invite' => $invitation->code])->assertRedirect();

    $first = User::query()->where('email', 'first@example.com')->firstOrFail();
    $this->post(route('logout'));

    expect($invitation->fresh()->used_by)->toBe($first->id)->and($invitation->fresh()->used_at)->not->toBeNull();

    register_as('second@example.com', ['invite' => $invitation->code])->assertSessionHasErrors('email');
    expect(User::query()->where('email', 'second@example.com')->exists())->toBeFalse();
});

test('an invitation for an address works for that address only', function () {
    config(['stashlist.registration' => 'invite']);
    $invitation = app(Invitations::class)->create('Ada@Example.com');
    User::factory()->create();

    register_as('someone-else@example.com', ['invite' => $invitation->code])->assertSessionHasErrors('email');
    register_as('ada@example.com', ['invite' => $invitation->code])->assertRedirect();
});

test('an expired invitation is no invitation', function () {
    config(['stashlist.registration' => 'invite']);
    User::factory()->create();
    $invitation = app(Invitations::class)->create(days: 1);
    $invitation->forceFill(['expires_at' => now()->subMinute()])->save();

    register_as('late@example.com', ['invite' => $invitation->code])->assertSessionHasErrors('email');
});

test('a failed sign-up does not use up the invitation', function () {
    config(['stashlist.registration' => 'invite']);
    User::factory()->create();
    $invitation = app(Invitations::class)->create();

    // The password confirmation is wrong, so no account is made.
    $this->post(route('register.store'), [
        'name' => 'Test',
        'email' => 'new@example.com',
        'password' => 'password',
        'password_confirmation' => 'different',
        'invite' => $invitation->code,
    ])->assertSessionHasErrors('password');

    expect($invitation->fresh()->used_at)->toBeNull();
});

test('the link from the invite command carries the code to the form', function () {
    config(['stashlist.registration' => 'invite']);
    User::factory()->create();

    $this->artisan('stashlist:invite', ['email' => 'ada@example.com'])->assertSuccessful();

    $invitation = Invitation::query()->sole();

    $this->get(route('register', ['invite' => $invitation->code]))->assertInertia(
        fn (AssertableInertia $page) => $page->where('registration', 'invite')->where('invite', $invitation->code),
    );
    expect($invitation->email)->toBe('ada@example.com')->and($invitation->expires_at)->not->toBeNull();
});
