<?php

declare(strict_types=1);

namespace App\Pipeline;

use App\Ai\Prices;
use App\Enums\AiStage;
use App\Enums\RunStatus;
use App\Models\Stash;
use App\Models\StashRun;
use App\Models\UsageMonthly;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Writes the log of a stage (stash_runs) and, in the same step, adds it to the user's monthly totals
 * (usage_monthly, which outlives the log). Also keeps the day's estimated spend, and opens the circuit breaker
 * when it passes the budget.
 */
final class UsageRecorder
{
    public function succeeded(Stash $stash, AiStage $stage, Attempt $attempt, ProviderCall $call): StashRun
    {
        $cost = Prices::cost($call->model, $call->tokensIn, $call->tokensOut);

        /** @var StashRun $run */
        $run = DB::transaction(function () use ($stash, $stage, $attempt, $call, $cost): StashRun {
            $run = $this->write($stash, $stage, RunStatus::Succeeded, $attempt, [
                'input_hash' => $call->inputHash,
                'provider' => $call->provider,
                'model' => $call->model,
                'tokens_in' => $call->tokensIn,
                'tokens_out' => $call->tokensOut,
                'cost_micros' => $cost,
            ]);

            $this->addToMonth($stash->user_id, $stage, stashes: 1, call: $call, cost: $cost);

            return $run;
        });

        $this->addToDay($cost);

        return $run;
    }

    /**
     * A stage that ended without calling a provider because there was nothing to do (the input had not changed).
     */
    public function skipped(Stash $stash, AiStage $stage, Attempt $attempt, string $hash): StashRun
    {
        return $this->write($stash, $stage, RunStatus::Skipped, $attempt, ['input_hash' => $hash]);
    }

    public function failed(Stash $stash, AiStage $stage, Attempt $attempt, Throwable $exception): StashRun
    {
        $code = PipelineError::code($exception, $stage);

        return $this->write($stash, $stage, RunStatus::Failed, $attempt, [
            'error_code' => $code,
            'error_class' => mb_substr($exception::class, start: 0, length: 150),
            // Provider errors can quote the request, which holds page text: see PipelineError::message().
            'error_msg' => PipelineError::message($exception),
            'retryable' => PipelineError::isRetryable($code),
        ]);
    }

    /**
     * @param  array<string, mixed>  $details
     */
    private function write(Stash $stash, AiStage $stage, RunStatus $status, Attempt $attempt, array $details): StashRun
    {
        $finished = CarbonImmutable::now();
        $startedAt = $attempt->startedAt;

        $run = new StashRun([
            'stash_id' => $stash->id,
            'user_id' => $stash->user_id,
            'stage' => $stage,
            'status' => $status,
            'attempt' => min($attempt->number, 255),
            'duration_ms' => $startedAt === null
                ? null
                : (int)max(0, round($startedAt->diffInMilliseconds($finished, absolute: true))),
            'started_at' => $startedAt ?? $finished,
            'finished_at' => $finished,
            ...$details,
        ]);
        $run->save();

        return $run;
    }

    /**
     * Adds a bulk call (a batch of stashes embedded together) to a user's month. There is no log line per stash
     * for these: the batch is not worth a row each.
     */
    public function batch(int $userId, AiStage $stage, int $stashes, ProviderCall $call): void
    {
        $cost = Prices::cost($call->model, $call->tokensIn, $call->tokensOut);

        $this->addToMonth($userId, $stage, $stashes, $call, $cost);
        $this->addToDay($cost);
    }

    private function addToMonth(int $userId, AiStage $stage, int $stashes, ProviderCall $call, int $cost): void
    {
        $period = now()->format('Y-m');
        $llm = $stage === AiStage::Enrich ? $stashes : 0;
        $embed = $stage === AiStage::Embed ? $stashes : 0;
        $tokensIn = $call->tokensIn;
        $tokensOut = $call->tokensOut;

        UsageMonthly::query()->upsert(
            [
                [
                    'user_id' => $userId,
                    'period' => $period,
                    'llm_stashes' => $llm,
                    'embed_stashes' => $embed,
                    'tokens_in' => $tokensIn,
                    'tokens_out' => $tokensOut,
                    'cost_micros' => $cost,
                ],
            ],
            ['user_id', 'period'],
            [
                'llm_stashes' => DB::raw("llm_stashes + {$llm}"),
                'embed_stashes' => DB::raw("embed_stashes + {$embed}"),
                'tokens_in' => DB::raw("tokens_in + {$tokensIn}"),
                'tokens_out' => DB::raw("tokens_out + {$tokensOut}"),
                'cost_micros' => DB::raw("cost_micros + {$cost}"),
            ],
        );
    }

    private function addToDay(int $cost): void
    {
        $key = 'ai:cost:'.now()->format('Ymd');

        Cache::add($key, 0, now()->addDays(2));
        $total = Cache::increment($key, $cost);

        if (is_int($total) && $total > (config()->float('stashlist.ai.daily_budget_usd') * 1_000_000)) {
            AiCircuitBreaker::open('the daily budget is spent');
        }
    }
}
