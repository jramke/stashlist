<?php

declare(strict_types=1);

use App\Enums\SocialProvider;
use App\Models\OAuthAccount;
use App\Models\User;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\AbstractProvider;
use Laravel\Socialite\Two\InvalidStateException;
use Laravel\Socialite\Two\User as SocialUser;

beforeEach(function () {
    config([
        'services.github.client_id' => 'github-id',
        'services.github.client_secret' => 'github-secret',
        'services.google.client_id' => 'google-id',
        'services.google.client_secret' => 'google-secret',
    ]);
});

/**
 * What a provider's user() gives back.
 *
 * @param  array<string, mixed>  $raw
 */
function social_user(
    string|int $id,
    ?string $email,
    array $raw = [],
    ?string $name = 'Ada Lovelace',
    ?string $nickname = 'ada',
): SocialUser {
    return new SocialUser()->setRaw($raw)->map([
        'id' => $id,
        'nickname' => $nickname,
        'name' => $name,
        'email' => $email,
        'avatar' => 'https://avatars.example/ada.png',
    ]);
}

/**
 * Makes the provider's side of the callback answer with this user (or fail with this exception).
 */
function provider_answers(SocialProvider $provider, SocialUser|Throwable $answer): void
{
    $driver = Mockery::mock(AbstractProvider::class);
    $driver->shouldReceive('scopes')->andReturnSelf();
    $answer instanceof Throwable
        ? $driver->shouldReceive('user')->andThrow($answer)
        : $driver->shouldReceive('user')->andReturn($answer);

    Socialite::shouldReceive('driver')->with($provider->value)->andReturn($driver);
}

function callback(SocialProvider $provider): TestResponse
{
    return test()->followingRedirects()->get("/login/{$provider->value}/callback?code=abc&state=xyz");
}

function login_toast(TestResponse $response, string $message): void
{
    $response->assertInertia(
        fn (AssertableInertia $page) => $page->component('auth/login')->hasFlash('toast', [
            'type' => 'error',
            'message' => $message,
            'undo_url' => null,
        ]),
    );
}

test('the auth pages offer the providers that are configured, and none when nothing is', function () {
    $this->get('/login')->assertInertia(fn (AssertableInertia $page) => $page->where('providers', [
        'github',
        'google',
    ]));
    $this->get('/register')->assertInertia(fn (AssertableInertia $page) => $page->where('providers', [
        'github',
        'google',
    ]));

    config(['services.github.client_secret' => null, 'services.google.client_id' => '']);

    $this->get('/login')->assertInertia(fn (AssertableInertia $page) => $page->where('providers', []));
});

test('a provider without an OAuth app and an unknown provider are not found', function () {
    config(['services.google.client_id' => null]);

    $this->get('/login/google')->assertNotFound();
    $this->get('/login/google/callback')->assertNotFound();
    $this->get('/login/gitlab')->assertNotFound();
});

test('the redirect goes to the provider and asks for the email address', function () {
    $github = $this->get('/login/github');
    $google = $this->get('/login/google');

    $github->assertRedirectContains('https://github.com/login/oauth/authorize');
    expect($github->headers->get('Location'))
        ->toContain('client_id=github-id')
        ->toContain('scope=user%3Aemail')
        ->toContain(urlencode(url('/login/github/callback')));

    $google->assertRedirectContains('https://accounts.google.com/o/oauth2/auth');
    expect($google->headers->get('Location'))->toContain('scope=openid+profile+email');
});

test('signed-in users do not see the sign-in routes', function () {
    $this->actingAs(User::factory()->create())->get('/login/github')->assertRedirect();
});

test('a known identity signs in its user and its details are refreshed', function () {
    $user = User::factory()->create();
    OAuthAccount::query()->create([
        'user_id' => $user->id,
        'provider' => 'github',
        'provider_id' => '583231',
        'email' => 'old@example.com',
    ]);
    provider_answers(SocialProvider::GitHub, social_user(583_231, 'new@example.com'));

    callback(SocialProvider::GitHub)->assertInertia(
        fn (AssertableInertia $page) => $page->component(
            'stashes/index',
        ),
    );

    $this->assertAuthenticatedAs($user);
    expect(OAuthAccount::query()->sole())
        ->email->toBe('new@example.com')
        ->avatar_url->toBe('https://avatars.example/ada.png')->and(User::query()->count())->toBe(1);
});

test('the provider id is compared as text', function () {
    $user = User::factory()->create();
    OAuthAccount::query()->create(['user_id' => $user->id, 'provider' => 'github', 'provider_id' => '007']);
    provider_answers(SocialProvider::GitHub, social_user(7, 'someone@example.com'));

    callback(SocialProvider::GitHub);

    $this->assertAuthenticated();
    $this->assertNotEquals($user->id, auth()->id());
});

test('the same id at another provider is another person', function () {
    $user = User::factory()->create();
    OAuthAccount::query()->create(['user_id' => $user->id, 'provider' => 'github', 'provider_id' => '42']);
    provider_answers(SocialProvider::Google, social_user('42', 'stranger@example.com', [
        'email_verified' => true,
    ]));

    callback(SocialProvider::Google);

    $this->assertAuthenticated();
    $this->assertNotEquals($user->id, auth()->id());
});

test('a verified email of an existing user links the identity to that user', function (
    SocialProvider $provider,
    array $raw,
) {
    $user = User::factory()->create(['email' => 'ada@example.com']);
    provider_answers($provider, social_user('900', 'Ada@Example.com', $raw));

    callback($provider);

    $this->assertAuthenticatedAs($user);
    expect(User::query()->count())
        ->toBe(1)
        ->and($user->oauthAccounts()->sole())
        ->provider->toBe($provider->value)
        ->provider_id->toBe('900')
        ->email->toBe('ada@example.com');
})->with([
    'github' => [SocialProvider::GitHub, []],
    'google' => [SocialProvider::Google, ['email_verified' => true]],
    'google, flag as text' => [SocialProvider::Google, ['email_verified' => 'true']],
]);

test('an email the provider has not verified is never used', function (array $raw) {
    $user = User::factory()->create(['email' => 'ada@example.com']);
    provider_answers(SocialProvider::Google, social_user('901', 'ada@example.com', $raw));

    $response = callback(SocialProvider::Google);

    $this->assertGuest();
    login_toast($response, 'We need a verified email address from Google to sign you in.');
    expect(User::query()->count())
        ->toBe(1)
        ->and(OAuthAccount::query()->count())
        ->toBe(0)
        ->and($user->password)
        ->not->toBeNull();
})->with([
    'flag false' => [['email_verified' => false]],
    'flag text false' => [['email_verified' => 'false']],
    'no flag' => [[]],
]);

test('an identity without any email address creates nothing', function (?string $email) {
    provider_answers(SocialProvider::GitHub, social_user('902', $email));

    $response = callback(SocialProvider::GitHub);

    $this->assertGuest();
    login_toast($response, 'We need a verified email address from GitHub to sign you in.');
    expect(User::query()->count())->toBe(0)->and(OAuthAccount::query()->count())->toBe(0);
})->with([null, '', '   ']);

test('a new verified identity gets an account without a password', function () {
    provider_answers(SocialProvider::Google, social_user(
        '903',
        'Grace@Example.com',
        ['email_verified' => true],
        'Grace Hopper',
    ));

    callback(SocialProvider::Google);

    $user = User::query()->sole();

    $this->assertAuthenticatedAs($user);
    expect($user->name)
        ->toBe('Grace Hopper')
        ->and($user->email)
        ->toBe('grace@example.com')
        ->and($user->password)
        ->toBeNull()
        ->and($user->email_verified_at)
        ->not
        ->toBeNull()
        ->and($user->oauthAccounts()->sole()->provider_id)
        ->toBe('903');
});

test('a missing name falls back to the nickname and then to the start of the email', function (
    ?string $name,
    ?string $nickname,
    string $expected,
) {
    provider_answers(SocialProvider::GitHub, social_user(
        '904',
        email: 'linus@example.com',
        name: $name,
        nickname: $nickname,
    ));

    callback(SocialProvider::GitHub);

    expect(User::query()->sole()->name)->toBe($expected);
})->with([
    'no name' => [null, 'ada', 'ada'],
    'blank name' => ['  ', 'ada', 'ada'],
    'no name and no nickname' => [null, null, 'linus'],
    'blank both' => [' ', ' ', 'linus'],
]);

test('a person who only signs in with a provider cannot sign in with a password', function () {
    provider_answers(SocialProvider::Google, social_user('905', 'grace@example.com', [
        'email_verified' => true,
    ]));
    callback(SocialProvider::Google);
    auth()->logout();

    $this->post(route('login.store'), ['email' => 'grace@example.com', 'password' => 'password']);
    $this->post(route('login.store'), ['email' => 'grace@example.com', 'password' => '']);

    $this->assertGuest();
});

test('an account that is being deleted cannot sign in', function () {
    $user = User::factory()->create();
    $user->forceFill(['deleting_at' => now()])->save();
    OAuthAccount::query()->create(['user_id' => $user->id, 'provider' => 'github', 'provider_id' => '906']);
    provider_answers(SocialProvider::GitHub, social_user('906', $user->email));

    login_toast(callback(SocialProvider::GitHub), 'This account is being deleted.');

    $this->assertGuest();
});

test('cancelling at the provider, a stale callback and a rejected code end at the login page', function () {
    login_toast(
        $this->followingRedirects()->get('/login/github/callback?error=access_denied'),
        'Signing in with GitHub was cancelled.',
    );

    provider_answers(SocialProvider::GitHub, new InvalidStateException);
    login_toast(callback(SocialProvider::GitHub), 'Signing in with GitHub did not work. Please try again.');

    $this->assertGuest();
});
