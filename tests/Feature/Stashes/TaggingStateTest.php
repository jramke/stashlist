<?php

declare(strict_types=1);

use App\Enums\AiStatus;
use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->create();
});

/**
 * The card of the only stash in the feed.
 *
 * @return array<string, mixed>
 */
function only_card(): array
{
    $page = test()->actingAs(test()->user)->get('/stashes')->viewData('page');

    return (array)$page['props']['stashes']['data'][0];
}

/**
 * @param  array<string, mixed>  $attributes
 */
function stash_with(AiStatus $status, array $attributes = []): Stash
{
    $stash = Stash::factory()->for(test()->user)->create();
    Stash::query()->whereKey($stash->id)->update(['ai_status' => $status->value, ...$attributes]);

    return $stash;
}

test('a stash waiting for the model is tagging', function (AiStatus $status) {
    stash_with($status);

    expect(only_card()['tagging'])->toBeTrue();
})->with([AiStatus::Pending, AiStatus::Processing]);

test('a stash that is done, failed or skipped is not tagging', function (AiStatus $status) {
    stash_with($status);

    expect(only_card()['tagging'])->toBeFalse();
})->with([AiStatus::Done, AiStatus::Failed, AiStatus::Skipped]);

test('a stash waiting for the monthly cap is not tagging, so the feed does not poll for it', function () {
    stash_with(AiStatus::Pending, ['ai_error' => 'quota']);

    expect(only_card()['tagging'])->toBeFalse();
});

test('a card stops waiting after fifteen minutes', function () {
    stash_with(AiStatus::Processing, ['updated_at' => now()->subMinutes(16)]);

    expect(only_card()['tagging'])->toBeFalse();
});

test('the card carries the summary, and the page description next to it', function () {
    $stash = stash_with(AiStatus::Done);
    StashEnrichment::query()->create([
        'stash_id' => $stash->id,
        'user_id' => $stash->user_id,
        'description' => 'The page says this.',
        'summary' => 'The model says this.',
    ]);

    expect(only_card())->toMatchArray(['summary' => 'The model says this.', 'description' => 'The page says this.']);
});

test('the detail page is given the same fields', function () {
    $stash = stash_with(AiStatus::Processing);

    $this
        ->actingAs($this->user)
        ->get("/stashes/{$stash->id}")
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('stashes/show')
                ->where('detail.stash.tagging', true)
                ->where('detail.stash.summary', null),
        );
});
