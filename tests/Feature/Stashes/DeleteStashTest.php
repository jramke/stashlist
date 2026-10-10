<?php

declare(strict_types=1);

use App\Jobs\FinishStashDeletion;
use App\Jobs\PurgeStashFiles;
use App\Models\Stash;
use App\Models\User;
use App\Stashes\PendingDeletion;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    Queue::fake();

    $this->user = User::factory()->create();
    $this->stash = Stash::factory()->for($this->user)->create();
});

test('deleting starts an undo window and the stash is still there', function () {
    $this
        ->actingAs($this->user)
        ->followingRedirects()
        ->from("/stashes/{$this->stash->id}")
        ->delete("/stashes/{$this->stash->id}")
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('stashes/index')
                ->hasFlash('toast', [
                    'type' => 'success',
                    'message' => 'Deleted.',
                    'undo_url' => "/stashes/{$this->stash->id}/deletion",
                ]),
        );

    Queue::assertPushed(
        FinishStashDeletion::class,
        fn (FinishStashDeletion $job): bool => (
            $job->stashId === $this->stash->id &&
            $job->delay === PendingDeletion::UNDO_SECONDS
        ),
    );

    expect(Stash::find($this->stash->id))
        ->not
        ->toBeNull()
        ->and(app(PendingDeletion::class)->isPending($this->stash->id))
        ->toBeTrue();
});

test('after the window the stash is deleted for real and its files are purged', function () {
    $this->actingAs($this->user)->delete("/stashes/{$this->stash->id}");

    new FinishStashDeletion($this->stash->id, $this->user->id)->handle(
        app(PendingDeletion::class),
        app(App\Actions\Stashes\DeleteStash::class),
    );

    expect(Stash::find($this->stash->id))
        ->toBeNull()
        ->and(app(PendingDeletion::class)->isPending($this->stash->id))
        ->toBeFalse();

    Queue::assertPushed(PurgeStashFiles::class);
});

test('undo cancels the deletion', function () {
    $this->actingAs($this->user)->delete("/stashes/{$this->stash->id}");

    $this
        ->actingAs($this->user)
        ->followingRedirects()
        ->delete("/stashes/{$this->stash->id}/deletion")
        ->assertInertia(fn (AssertableInertia $page) => $page->hasFlash('toast', [
            'type' => 'success',
            'message' => 'Restored.',
            'undo_url' => null,
        ]));

    new FinishStashDeletion($this->stash->id, $this->user->id)->handle(
        app(PendingDeletion::class),
        app(App\Actions\Stashes\DeleteStash::class),
    );

    expect(Stash::find($this->stash->id))->not->toBeNull();
});

test('the job does nothing when nothing is pending, for example after a cache flush', function () {
    $this->actingAs($this->user)->delete("/stashes/{$this->stash->id}");

    Cache::flush();

    new FinishStashDeletion($this->stash->id, $this->user->id)->handle(
        app(PendingDeletion::class),
        app(App\Actions\Stashes\DeleteStash::class),
    );

    expect(Stash::find($this->stash->id))->not->toBeNull();
});

test('the job never deletes a stash of another user', function () {
    $other = User::factory()->create();
    $this->actingAs($this->user)->delete("/stashes/{$this->stash->id}");

    new FinishStashDeletion($this->stash->id, $other->id)->handle(
        app(PendingDeletion::class),
        app(App\Actions\Stashes\DeleteStash::class),
    );

    expect(Stash::find($this->stash->id))->not->toBeNull();
});
