<?php

declare(strict_types=1);

use App\Enums\AiStage;
use App\Enums\AiStatus;
use App\Enums\RunStatus;
use App\Jobs\ExtractContent;
use App\Jobs\FetchFavicon;
use App\Jobs\GenerateEmbedding;
use App\Jobs\GenerateEnrichment;
use App\Jobs\IndexStash;
use App\Jobs\RetryFailedStashes;
use App\Jobs\SweepStuckStashes;
use App\Models\Stash;
use App\Models\StashRun;
use App\Models\UsageMonthly;
use App\Pipeline\AiCircuitBreaker;
use Illuminate\Support\Facades\Queue;
use Tests\Support\FakeAi;

beforeEach(function () {
    Queue::fake();
    FakeAi::install();
});

/**
 * A stash in a given AI state for a given time, with timestamps set the way they would be then.
 *
 * @param  array<string, mixed>  $attributes
 */
function stash_in_state(AiStatus $status, int $minutesAgo, array $attributes = []): Stash
{
    $stash = Stash::factory()->note()->create();
    Stash::query()
        ->whereKey($stash->id)
        ->update([
            'ai_status' => $status->value,
            'updated_at' => now()->subMinutes($minutesAgo),
            ...$attributes,
        ]);

    return $stash;
}

test('the sweeper puts a stash that has been processing for half an hour back on the queue', function () {
    $stuck = stash_in_state(AiStatus::Processing, 31);
    $busy = stash_in_state(AiStatus::Processing, 5);

    app()->call([new SweepStuckStashes, 'handle']);

    Queue::assertPushed(GenerateEnrichment::class, 1);
    Queue::assertPushed(GenerateEnrichment::class, fn (GenerateEnrichment $job): bool => $job->stashId === $stuck->id);
    Queue::assertNotPushed(
        GenerateEnrichment::class,
        fn (GenerateEnrichment $job): bool => $job->stashId === $busy->id,
    );
});

test('the sweeper picks up a stash pending for an hour, but not one that waits for a reason', function () {
    $lost = stash_in_state(AiStatus::Pending, 61);
    stash_in_state(AiStatus::Pending, 61, ['ai_error' => 'quota']);
    stash_in_state(AiStatus::Pending, 10);
    stash_in_state(AiStatus::Done, 600);

    app()->call([new SweepStuckStashes, 'handle']);

    Queue::assertPushed(GenerateEnrichment::class, 1);
    Queue::assertPushed(GenerateEnrichment::class, fn (GenerateEnrichment $job): bool => $job->stashId === $lost->id);
});

test('the nightly retry runs again what failed for a reason that passes, for three days', function () {
    $down = stash_in_state(AiStatus::Failed, 60, [
        'ai_stage' => AiStage::Enrich->value,
        'ai_error' => 'provider_unavailable',
    ]);
    $old = stash_in_state(AiStatus::Failed, 60 * 24 * 4, [
        'ai_stage' => AiStage::Enrich->value,
        'ai_error' => 'provider_unavailable',
    ]);
    $invalid = stash_in_state(AiStatus::Failed, 60, [
        'ai_stage' => AiStage::Enrich->value,
        'ai_error' => 'llm_invalid',
    ]);

    app()->call([new RetryFailedStashes, 'handle']);

    Queue::assertPushed(GenerateEnrichment::class, 1);
    Queue::assertPushed(GenerateEnrichment::class, fn (GenerateEnrichment $job): bool => $job->stashId === $down->id);
    Queue::assertNotPushed(GenerateEnrichment::class, fn (GenerateEnrichment $job): bool => in_array(
        $job->stashId,
        [$old->id, $invalid->id],
        true,
    ));
});

test('a failure in extraction starts again from the top', function () {
    $stash = Stash::factory()->create();
    Stash::query()
        ->whereKey($stash->id)
        ->update([
            'ai_status' => AiStatus::Failed->value,
            'ai_stage' => AiStage::Extract->value,
            'ai_error' => 'fetch_failed',
        ]);

    app()->call([new RetryFailedStashes, 'handle']);

    Queue::assertPushedWithChain(ExtractContent::class, [
        FetchFavicon::class,
        GenerateEnrichment::class,
        GenerateEmbedding::class,
        IndexStash::class,
    ]);
});

test('a stash that waited for the monthly cap runs once there is room', function () {
    config(['stashlist.plans.free.ai_stashes_per_month' => 1]);
    $waiting = stash_in_state(AiStatus::Pending, 60, ['ai_stage' => AiStage::Enrich->value, 'ai_error' => 'quota']);
    UsageMonthly::query()->create([
        'user_id' => $waiting->user_id,
        'period' => now()->format('Y-m'),
        'llm_stashes' => 1,
    ]);

    app()->call([new RetryFailedStashes, 'handle']);
    Queue::assertNotPushed(GenerateEnrichment::class);

    UsageMonthly::query()->where('user_id', $waiting->user_id)->update(['llm_stashes' => 0]);
    app()->call([new RetryFailedStashes, 'handle']);
    Queue::assertPushed(GenerateEnrichment::class, 1);
});

test('nothing is retried while the breaker is open', function () {
    stash_in_state(AiStatus::Failed, 60, ['ai_stage' => AiStage::Enrich->value, 'ai_error' => 'provider_unavailable']);
    AiCircuitBreaker::open('test');

    app()->call([new RetryFailedStashes, 'handle']);

    Queue::assertNotPushed(GenerateEnrichment::class);
});

test('the run log keeps succeeded runs for 30 days and failed ones for 90', function () {
    $stash = Stash::factory()->note()->create();
    $run = static fn (RunStatus $status, int $days): int => StashRun::query()->create([
        'stash_id' => $stash->id,
        'user_id' => $stash->user_id,
        'stage' => AiStage::Enrich,
        'status' => $status,
        'started_at' => now()->subDays($days),
    ])->id;

    $oldOk = $run(RunStatus::Succeeded, 31);
    $newOk = $run(RunStatus::Succeeded, 29);
    $oldFailed = $run(RunStatus::Failed, 91);
    $newFailed = $run(RunStatus::Failed, 89);

    $this->artisan('model:prune', ['--model' => [StashRun::class]])->assertSuccessful();

    expect(StashRun::query()->pluck('id')->sort()->values()->all())->toBe([$newOk, $newFailed]);
    expect([$oldOk, $oldFailed])->each->not->toBeIn(StashRun::query()->pluck('id')->all());
});
