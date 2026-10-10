<?php

declare(strict_types=1);

use App\Actions\Stashes\CapturePayload;
use App\Actions\Stashes\CaptureStash;
use App\Enums\TokenAbility;
use App\Models\Stash;
use App\Models\UsageMonthly;
use App\Models\User;
use App\Support\Limits;
use App\Support\StashLimitReached;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Images;

beforeEach(function () {
    Queue::fake();
    Storage::fake();

    $this->user = User::factory()->create();
});

test('an account has the caps of its plan, and an unknown plan falls back to free', function () {
    $free = app(Limits::class)->planOf($this->user->id);

    expect($free->name)
        ->toBe('free')
        ->and($free->stashes)
        ->toBe(2000)
        ->and($free->storageBytes)
        ->toBe(2048 * 1024 * 1024)
        ->and($free->aiStashesPerMonth)
        ->toBe(300)
        ->and($free->searchesPerMinute)
        ->toBe(60);

    $this->user->forceFill(['plan' => 'flat'])->save();
    expect(app(Limits::class)->planOf($this->user->id)->stashes)->toBe(25_000);

    $this->user->forceFill(['plan' => 'made-up'])->save();
    expect(app(Limits::class)->planOf($this->user->id)->name)->toBe('free');
});

test('one plan can be forced on everyone, which is how a self-hosted installation has no caps', function () {
    config(['stashlist.plan' => 'unlimited']);

    $plan = app(Limits::class)->planOf($this->user->id);

    expect($plan->name)
        ->toBe('unlimited')
        ->and($plan->stashes)
        ->toBeNull()
        ->and($plan->storageBytes)
        ->toBeNull()
        ->and($plan->aiStashesPerMonth)
        ->toBeNull();
    expect(app(Limits::class)->mayEnrich($this->user->id))->toBeTrue();
});

test('the cap on stashes stops a new one, but not a link that is saved already', function () {
    config(['stashlist.plans.free.stashes' => 2]);
    $capture = app(CaptureStash::class);

    $capture->capture($this->user, new CapturePayload(input: 'https://example.com/one'));
    $capture->capture($this->user, new CapturePayload(input: 'a note'));

    expect(fn () => $capture->capture($this->user, new CapturePayload(input: 'https://example.com/two')))
        ->toThrow(StashLimitReached::class, 'You have reached the limit of 2 stashes on your plan.');
    expect($capture->capture($this->user, new CapturePayload(input: 'https://example.com/one'))->created)->toBeFalse();
    expect(Stash::count())->toBe(2);
});

test('the cap counts only my stashes', function () {
    config(['stashlist.plans.free.stashes' => 1]);
    Stash::factory()->create();

    $created = app(CaptureStash::class)->capture($this->user, new CapturePayload(input: 'my note'));

    expect($created->created)->toBeTrue();
});

test('the cap on storage stops an upload that does not fit', function () {
    $upload = UploadedFile::fake()->createWithContent('photo.png', Images::make('png', width: 200, height: 200));
    // A cap of nothing: any file is too much, and the stash is not made at all.
    config(['stashlist.plans.free.storage_megabytes' => 0]);

    expect(fn () => app(CaptureStash::class)->capture($this->user, new CapturePayload(image: $upload)))
        ->toThrow(StashLimitReached::class, 'all the storage');
    expect(Stash::count())->toBe(0);
});

test('on the web a save over the cap flashes a message and saves nothing', function () {
    config(['stashlist.plans.free.stashes' => 0]);

    $this
        ->actingAs($this->user)
        ->from('/stashes')
        ->followingRedirects()
        ->post('/stashes', ['input' => 'a note'])
        ->assertInertia(fn (AssertableInertia $page) => $page->hasFlash('toast', [
            'type' => 'error',
            'message' => 'You have reached the limit of 0 stashes on your plan.',
            'undo_url' => null,
        ]));

    expect(Stash::count())->toBe(0);
});

test('through the API a save over the cap is a rejected input with the reason', function () {
    config(['stashlist.plans.free.stashes' => 0]);
    $token = $this->user->createToken('test', TokenAbility::values())->plainTextToken;

    $this
        ->withToken($token)
        ->postJson('/api/v1/stashes', ['url' => 'https://example.com/one'])
        ->assertUnprocessable()
        ->assertJson(['errors' => ['input' => ['You have reached the limit of 0 stashes on your plan.']]]);
});

test('summaries stop at the monthly cap and come back next month', function () {
    config(['stashlist.plans.free.ai_stashes_per_month' => 5]);
    $limits = app(Limits::class);
    UsageMonthly::query()->create(['user_id' => $this->user->id, 'period' => now()->format('Y-m'), 'llm_stashes' => 5]);

    expect($limits->mayEnrich($this->user->id))->toBeFalse();

    $this->travelTo(now()->addMonth());

    expect($limits->mayEnrich($this->user->id))->toBeTrue();
});

test('a search is limited per minute by the plan', function () {
    config(['stashlist.plans.free.searches_per_minute' => 2]);

    foreach ([200, 200, 429] as $status) {
        $this->actingAs($this->user)->get('/stashes?q=bread&mode=keyword')->assertStatus($status);
    }

    // Browsing without a query is not limited.
    $this->actingAs($this->user)->get('/stashes')->assertOk();
});

test('the usage page shows what is used against what the plan allows', function () {
    Stash::factory()->count(3)->for($this->user)->create();
    UsageMonthly::query()->create(['user_id' => $this->user->id, 'period' => now()->format('Y-m'), 'llm_stashes' => 7]);

    $this
        ->actingAs($this->user)
        ->get('/settings/usage')
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('settings/usage')
                ->where('usage.plan', 'free')
                ->where('usage.stashes', 3)
                ->where('usage.stashes_cap', 2000)
                ->where('usage.ai_stashes', 7)
                ->where('usage.ai_stashes_cap', 300)
                ->where('usage.storage_bytes', 0),
        );

    $this->get('/settings/usage')->assertOk();
});

test('guests cannot see the usage page', function () {
    auth()->logout();

    $this->get('/settings/usage')->assertRedirect('/login');
});
