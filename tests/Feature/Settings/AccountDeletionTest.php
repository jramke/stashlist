<?php

declare(strict_types=1);

use App\Enums\FileRole;
use App\Jobs\BuildExport;
use App\Jobs\DeleteAccount;
use App\Models\Collection;
use App\Models\Export;
use App\Models\OAuthAccount;
use App\Models\Stash;
use App\Models\StashEmbedding;
use App\Models\StashEnrichment;
use App\Models\StashHighlight;
use App\Models\StashRun;
use App\Models\Tag;
use App\Models\UsageMonthly;
use App\Models\User;
use App\Search\UserIndex;
use App\Storage\Blob;
use App\Storage\StashStorage;
use App\Tags\TagSync;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakeSearchEngine;
use Tests\Support\Images;

beforeEach(function () {
    Storage::fake();
    FakeSearchEngine::install();

    // The real index is not here: this stands in for the part of the engine the job talks to.
    $state = new class {
        /** @var list<int> */
        public array $purged = [];

        public int $left = 0;
    };
    $this->index = $state;
    $this->index = $state;
    $this->app->instance(UserIndex::class, new readonly class($state) implements UserIndex {
        public function __construct(
            private object $state,
        ) {}

        public function purge(int $userId): void
        {
            $this->state->purged[] = $userId;
        }

        public function count(int $userId): int
        {
            return $this->state->left;
        }
    });

    $this->user = User::factory()->create(['email' => 'ada@example.com', 'password' => Hash::make('secret-pass-1')]);
});

/**
 * Everything an account can have, so that nothing may survive.
 */
function fill_account(User $user): Stash
{
    $stash = Stash::factory()->for($user)->create();
    StashEnrichment::query()->create(['stash_id' => $stash->id, 'user_id' => $user->id, 'summary' => 'x']);
    app(TagSync::class)->addByUser($stash, 'baking');
    StashHighlight::factory()->onStash($stash)->create();
    $collection = Collection::factory()->for($user)->create();
    $stash->collections()->attach($collection->id, ['user_id' => $user->id, 'created_at' => now()]);
    app(StashStorage::class)->store(
        $stash,
        FileRole::Original,
        new Blob(Images::make('png', width: 10, height: 10), 'image/png', 10, 10),
    );
    StashEmbedding::query()->create([
        'stash_id' => $stash->id,
        'embedder' => 'text_v1',
        'user_id' => $user->id,
        'model' => 'm',
        'dimensions' => 1,
        'recipe_version' => 1,
        'input_hash' => str_repeat('a', 64),
        'vector' => pack('g', 0.5),
    ]);
    StashRun::query()->create([
        'stash_id' => $stash->id,
        'user_id' => $user->id,
        'stage' => 'enrich',
        'status' => 'succeeded',
        'started_at' => now(),
    ]);
    UsageMonthly::query()->create(['user_id' => $user->id, 'period' => now()->format('Y-m'), 'llm_stashes' => 3]);
    $export = new Export;
    $export->forceFill(['user_id' => $user->id, 'status' => 'ready', 'path' => "u/{$user->id}/exports/1.zip"])->save();
    $user->createToken('extension', ['stash:create']);
    $user->oauthAccounts()->create([
        'provider' => 'github',
        'provider_id' => (string)$user->id,
        'email' => $user->email,
    ]);

    return $stash;
}

test('asking to delete locks the account at once, starts the job and signs the person out', function () {
    Queue::fake();
    fill_account($this->user);

    $this
        ->actingAs($this->user)
        ->delete('/settings/account', ['confirmation' => 'secret-pass-1'])
        ->assertRedirect('/');

    $this->assertGuest();
    expect($this->user->fresh()->deleting_at)->not->toBeNull();
    Queue::assertPushed(DeleteAccount::class, fn (DeleteAccount $job): bool => $job->userId === $this->user->id);
    // Nothing is removed yet: the job does that.
    expect(Stash::query()->where('user_id', $this->user->id)->count())->toBe(1);
});

test('the wrong password does not delete anything', function () {
    Queue::fake();

    $this
        ->actingAs($this->user)
        ->delete('/settings/account', ['confirmation' => 'wrong'])
        ->assertSessionHasErrors(['confirmation' => 'That is not your password.']);

    expect($this->user->fresh()->deleting_at)->toBeNull();
    Queue::assertNothingPushed();
});

test('an account without a password confirms with its email address', function () {
    Queue::fake();
    $social = User::factory()->create(['email' => 'grace@example.com', 'password' => null]);

    $this
        ->actingAs($social)
        ->delete('/settings/account', ['confirmation' => 'nobody@example.com'])
        ->assertSessionHasErrors('confirmation');
    $this->delete('/settings/account', ['confirmation' => ' Grace@Example.com '])->assertRedirect('/');

    expect($social->fresh()->deleting_at)->not->toBeNull();
});

test('guests cannot delete anything', function () {
    $this->delete('/settings/account', ['confirmation' => 'x'])->assertRedirect('/login');
});

test('the job removes the search documents, the files, the rows and finally the user', function () {
    $stash = fill_account($this->user);
    $other = fill_account(User::factory()->create());
    $this->user->forceFill(['deleting_at' => now()])->save();

    dispatch_sync(new DeleteAccount($this->user->id));

    expect(User::query()->whereKey($this->user->id)->exists())
        ->toBeFalse()
        ->and(Stash::query()->withoutGlobalScopes()->where('user_id', $this->user->id)->count())
        ->toBe(0)
        ->and(Tag::query()->withoutGlobalScopes()->where('user_id', $this->user->id)->count())
        ->toBe(0)
        ->and(Collection::query()->withoutGlobalScopes()->where('user_id', $this->user->id)->count())
        ->toBe(0)
        ->and(StashHighlight::query()->withoutGlobalScopes()->where('user_id', $this->user->id)->count())
        ->toBe(0)
        ->and(StashEmbedding::query()->withoutGlobalScopes()->where('user_id', $this->user->id)->count())
        ->toBe(0)
        ->and(StashRun::query()->withoutGlobalScopes()->where('user_id', $this->user->id)->count())
        ->toBe(0)
        ->and(UsageMonthly::query()->where('user_id', $this->user->id)->count())
        ->toBe(0)
        ->and(Export::query()->withoutGlobalScopes()->where('user_id', $this->user->id)->count())
        ->toBe(0)
        ->and(OAuthAccount::query()->where('user_id', $this->user->id)->count())
        ->toBe(0)
        ->and(DB::table('personal_access_tokens')->where('tokenable_id', $this->user->id)->count())
        ->toBe(0)
        ->and(Storage::allFiles("u/{$this->user->id}"))
        ->toBeEmpty()
        ->and($this->index->purged)
        ->toContain($this->user->id);

    // Someone else's account is as it was.
    expect(Stash::query()->withoutGlobalScopes()->where('user_id', $other->user_id)->count())
        ->toBe(1)
        ->and(Storage::allFiles("u/{$other->user_id}"))
        ->not
        ->toBeEmpty()
        ->and(User::query()->whereKey($other->user_id)->exists())
        ->toBeTrue();
    expect($this->index->purged)->not->toContain($other->user_id);
});

test('a large library is removed in chunks', function () {
    Stash::factory()->count(2300)->for($this->user)->create();
    $this->user->forceFill(['deleting_at' => now()])->save();

    dispatch_sync(new DeleteAccount($this->user->id));

    expect(Stash::query()->withoutGlobalScopes()->count())
        ->toBe(0)
        ->and(User::query()->whereKey($this->user->id)->exists())
        ->toBeFalse();
});

test('the job only removes an account that was marked for deletion', function () {
    fill_account($this->user);

    dispatch_sync(new DeleteAccount($this->user->id));

    expect(User::query()->whereKey($this->user->id)->exists())
        ->toBeTrue()
        ->and(Stash::query()->withoutGlobalScopes()->count())
        ->toBe(1);
});

test('a job that finds the account gone ends quietly, so a repeat is harmless', function () {
    $this->user->forceFill(['deleting_at' => now()])->save();

    dispatch_sync(new DeleteAccount($this->user->id));
    dispatch_sync(new DeleteAccount($this->user->id));

    expect(User::query()->whereKey($this->user->id)->exists())->toBeFalse();
});

test('if the search index still holds documents afterwards the job fails and will run again', function () {
    $this->user->forceFill(['deleting_at' => now()])->save();
    $this->index->left = 3;

    expect(fn () => dispatch_sync(new DeleteAccount($this->user->id)))
        ->toThrow(RuntimeException::class, 'still in the search index');
});

test('the job is tried for three days', function () {
    $this->travelTo(now());

    expect(new DeleteAccount(1)->retryUntil()->getTimestamp())->toBe(now()->addDays(3)->getTimestamp());
});

test('a locked account cannot do anything on the web, and is signed out when it tries', function () {
    $this->user->forceFill(['deleting_at' => now()])->save();

    $this->actingAs($this->user)->get('/stashes')->assertRedirect('/login');
    $this->assertGuest();
});

test('a locked account cannot use its tokens', function () {
    $token = $this->user->createToken('extension', ['stash:read'])->plainTextToken;
    $this->withToken($token)->getJson('/api/v1/me')->assertOk();

    $this->user->forceFill(['deleting_at' => now()])->save();
    // The guard remembers the user of the request before; a real second request starts fresh.
    app('auth')->forgetGuards();

    $this->withToken($token)->getJson('/api/v1/me')->assertUnauthorized();
});

test('a locked account has no export built', function () {
    $this->user->forceFill(['deleting_at' => now()])->save();
    $export = new Export;
    $export->user_id = $this->user->id;
    $export->save();

    dispatch_sync(new BuildExport($export->id, $this->user->id));

    expect($export->fresh()->path)->toBeNull();
});
