<?php

declare(strict_types=1);

use App\Enums\AiStage;
use App\Enums\AiStatus;
use App\Enums\StashType;
use App\Jobs\ExtractContent;
use App\Models\Stash;
use App\Models\User;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Route;

beforeEach(function () {
    Queue::fake();

    $this->user = User::factory()->create();
});

test('retrying clears the failure and extracts again, even when nothing seems to have changed', function () {
    $stash = Stash::factory()->for($this->user)->create([
        'ai_status' => AiStatus::Failed,
        'ai_stage' => AiStage::Extract,
        'ai_error' => 'fetch_failed',
    ]);

    $this->actingAs($this->user)->from('/stashes')->post("/stashes/{$stash->id}/reprocess")->assertRedirect('/stashes');

    $fresh = $stash->fresh();

    expect($fresh->ai_status)
        ->toBe(AiStatus::Skipped)
        ->and($fresh->ai_stage)
        ->toBeNull()
        ->and($fresh->ai_error)
        ->toBeNull();

    Queue::assertPushed(
        ExtractContent::class,
        fn (ExtractContent $job): bool => $job->force && $job->stashId === $stash->id,
    );
});

test('notes have nothing to run again', function () {
    $stash = Stash::factory()->for($this->user)->note()->create();

    $this->actingAs($this->user)->from('/stashes')->post("/stashes/{$stash->id}/reprocess")->assertRedirect('/stashes');

    expect($stash->fresh()->type)->toBe(StashType::Note);

    Queue::assertNothingPushed();
});

test('retrying is rate limited', function () {
    $middleware = Route::getRoutes()->getByName('stashes.reprocess')?->gatherMiddleware() ?? [];

    expect($middleware)->toContain('throttle:reprocess');
});
