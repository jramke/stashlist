<?php

declare(strict_types=1);

use App\Ai\Agents\StashEnricher;
use App\Ai\AiGuard;
use App\Ai\AiNotAllowed;
use App\Ai\Enricher;
use App\Models\Stash;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Tests\Support\FakeAi;

beforeEach(function () {
    FakeAi::install();
    Http::fake();
});

test('a stash of a user with smart features on may go to the model', function () {
    $stash = Stash::factory()->note()->create();

    expect(app(AiGuard::class)->allows($stash))->toBeTrue();
});

test('the enricher refuses a user who turned smart features off, before anything is built or sent', function () {
    $stash = Stash::factory()
        ->for(User::factory()->create(['ai_enabled' => false]))
        ->note()
        ->create();

    expect(fn () => app(Enricher::class)->enrich($stash))->toThrow(AiNotAllowed::class);

    StashEnricher::assertNeverPrompted();
    Http::assertNothingSent();
});

test('the enricher refuses everything when the instance has AI off', function () {
    config(['stashlist.ai.enabled' => false]);
    $stash = Stash::factory()->note()->create();

    expect(fn () => app(Enricher::class)->enrich($stash))->toThrow(AiNotAllowed::class);

    StashEnricher::assertNeverPrompted();
    Http::assertNothingSent();
});

test('the switch of one user does not touch another', function () {
    $off = Stash::factory()
        ->for(User::factory()->create(['ai_enabled' => false]))
        ->note()
        ->create();
    $on = Stash::factory()->note()->create();

    expect(app(AiGuard::class)->allows($off))->toBeFalse()->and(app(AiGuard::class)->allows($on))->toBeTrue();
});
