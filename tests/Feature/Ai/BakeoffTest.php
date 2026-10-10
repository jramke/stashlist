<?php

declare(strict_types=1);

use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakeAi;

beforeEach(function () {
    Storage::fake('local');
});

function readable_link(User $user, string $domain): Stash
{
    $stash = Stash::factory()->for($user)->create(['domain' => $domain, 'title' => "A page on {$domain}"]);
    StashEnrichment::query()->create([
        'stash_id' => $stash->id,
        'user_id' => $user->id,
        'extracted_text' => "Text of the page on {$domain}. ".str_repeat('More words. ', 30),
    ]);

    return $stash;
}

test('the same stashes go through every model and the report sets the answers side by side', function () {
    $user = User::factory()->create();
    readable_link($user, 'bakeclub.example');
    readable_link($user, 'knitting.example');
    // One answer per call, in order: two stashes times two models.
    FakeAi::install([
        FakeAi::response(FakeAi::answer(['tags' => ['sourdough', 'baking', 'bread']]), 2000, 200),
        FakeAi::response(FakeAi::answer(['tags' => ['sourdough', 'bread', 'baking', 'yeast', 'flour']]), 2100, 300),
        FakeAi::response(FakeAi::answer(['language' => 'de']), 2000, 200),
        FakeAi::response(FakeAi::answer(), 2100, 300),
    ]);

    $this->artisan('stashlist:bakeoff', [
        '--user' => $user->id,
        '--models' => 'openai:gpt-5-nano,openai:gpt-5-mini',
        '--count' => 2,
        '--yes' => true,
    ])->assertSuccessful();

    $report = Storage::disk('local')->get(Storage::disk('local')->files('bakeoff')[0]);

    expect($report)
        ->toContain('2 stashes, 2 models')
        ->toContain('| openai:gpt-5-nano | 2 | 0 |')
        ->toContain('| openai:gpt-5-mini | 2 | 0 |')
        ->toContain('**openai:gpt-5-nano** [en, article]: sourdough, baking, bread')
        ->toContain('**openai:gpt-5-mini** [en, article]: sourdough, bread, baking, yeast, flour')
        ->toContain('[de, article]');
});

test('a model that fails is counted and named in the report', function () {
    $user = User::factory()->create();
    readable_link($user, 'bakeclub.example');
    FakeAi::install([[]]);

    $this->artisan('stashlist:bakeoff', ['--user' => $user->id, '--models' => 'openai:gpt-5-nano', '--yes' => true])
        ->assertSuccessful();

    $report = Storage::disk('local')->get(Storage::disk('local')->files('bakeoff')[0]);

    expect($report)->toContain('| openai:gpt-5-nano | 0 | 1 |')->toContain('llm_refused');
});

test('only the stashes of the given user are used, and only those the model has text for', function () {
    $user = User::factory()->create();
    readable_link($user, 'bakeclub.example');
    Stash::factory()->for($user)->create();
    readable_link(User::factory()->create(), 'someone-else.example');
    FakeAi::install([FakeAi::answer()]);

    $this->artisan('stashlist:bakeoff', ['--user' => $user->id, '--models' => 'openai:gpt-5-nano', '--yes' => true])
        ->assertSuccessful();

    $report = Storage::disk('local')->get(Storage::disk('local')->files('bakeoff')[0]);

    expect($report)->toContain('1 stashes, 1 models')->not->toContain('someone-else.example');
});

test('it stops when there is no such user, no model it can read or no stash', function () {
    $this->artisan('stashlist:bakeoff', ['--user' => 999_999])->assertFailed();

    $user = User::factory()->create();

    $this->artisan('stashlist:bakeoff', ['--user' => $user->id, '--models' => 'gpt-5-nano'])->assertFailed();
    $this->artisan('stashlist:bakeoff', ['--user' => $user->id, '--yes' => true])->assertFailed();
});

test('it asks before the text of the stashes is sent anywhere', function () {
    $user = User::factory()->create();
    readable_link($user, 'bakeclub.example');
    FakeAi::install();

    $this
        ->artisan('stashlist:bakeoff', ['--user' => $user->id, '--models' => 'openai:gpt-5-nano'])
        ->expectsConfirmation('Send the text of these stashes to the providers named above?', 'no')
        ->assertFailed();

    expect(Storage::disk('local')->files('bakeoff'))->toBeEmpty();
});
