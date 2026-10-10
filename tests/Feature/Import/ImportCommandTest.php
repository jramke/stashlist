<?php

declare(strict_types=1);

use App\Models\Stash;
use App\Models\User;
use Illuminate\Support\Facades\Queue;

const OLD_DUMP_FILE = __DIR__.'/../../fixtures/old-dump.sql';

beforeEach(function () {
    Queue::fake();
    $this->user = User::factory()->create();
});

test('it imports the saves of one old user into the given user', function () {
    $this
        ->artisan('stashlist:import-old', ['dump' => OLD_DUMP_FILE, '--user' => $this->user->id, '--old-user' => 'u1'])
        ->expectsOutputToContain('Imported')
        ->expectsOutputToContain('Skipped 2: no url')
        ->expectsOutputToContain('fetches every imported link again')
        ->assertSuccessful();

    expect(Stash::query()->where('user_id', $this->user->id)->count())->toBe(4);
});

test('a dry run only counts', function () {
    $this
        ->artisan('stashlist:import-old', [
            'dump' => OLD_DUMP_FILE,
            '--user' => $this->user->id,
            '--old-user' => 'u1',
            '--dry-run' => true,
        ])
        ->expectsOutputToContain('Would import')
        ->expectsOutputToContain('Dry run: nothing was written.')
        ->assertSuccessful();

    expect(Stash::query()->count())->toBe(0);
});

test('a dump with several users needs to be told which one', function () {
    $this
        ->artisan('stashlist:import-old', ['dump' => OLD_DUMP_FILE, '--user' => $this->user->id])
        ->expectsOutputToContain('Pass one with --old-user')
        ->assertFailed();

    expect(Stash::query()->count())->toBe(0);
});

test('it needs an existing user and a readable dump', function () {
    $this
        ->artisan('stashlist:import-old', ['dump' => OLD_DUMP_FILE, '--user' => 999_999])
        ->expectsOutputToContain('Pass the id of an existing user')
        ->assertFailed();

    $this
        ->artisan('stashlist:import-old', ['dump' => '/nonexistent.sql', '--user' => $this->user->id])
        ->expectsOutputToContain('Cannot read the dump')
        ->assertFailed();

    $this->artisan('stashlist:import-old', ['dump' => OLD_DUMP_FILE])->assertFailed();
});
