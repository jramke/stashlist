<?php

declare(strict_types=1);

use App\Models\Stash;
use App\Models\StashHighlight;
use App\Models\User;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    Queue::fake();

    $this->user = User::factory()->create();
    $this->stash = Stash::factory()->for($this->user)->create(['url' => 'https://bakeclub.example/starter']);
});

test('the stash page lists the highlights with a link that opens the page at the passage', function () {
    StashHighlight::factory()
        ->onStash($this->stash)
        ->create([
            'text' => 'a living culture',
            'prefix' => 'starter is ',
            'suffix' => ' of wild yeast',
            'note' => 'remember',
        ]);

    $this
        ->actingAs($this->user)
        ->get("/stashes/{$this->stash->id}")
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->has('detail.highlights', 1)
                ->where('detail.highlights.0.text', 'a living culture')
                ->where('detail.highlights.0.note', 'remember')
                ->where(
                    'detail.highlights.0.page_link',
                    'https://bakeclub.example/starter#:~:text=starter%20is-,a%20living%20culture,-of%20wild%20yeast',
                ),
        );
});

test('a stash without an address has highlights without a link', function () {
    $note = Stash::factory()->for($this->user)->note()->create();
    StashHighlight::factory()->onStash($note)->create();

    $this
        ->actingAs($this->user)
        ->get("/stashes/{$note->id}")
        ->assertInertia(fn (AssertableInertia $page) => $page->where('detail.highlights.0.page_link', null));
});

test('the note can be changed and cleared, the passage stays', function () {
    $highlight = StashHighlight::factory()->onStash($this->stash)->create(['text' => 'fixed', 'note' => 'old']);

    $this->actingAs($this->user)->patch("/highlights/{$highlight->id}", [
        'note' => 'new',
        'text' => 'ignored',
    ])->assertRedirect();

    expect($highlight->fresh())->note->toBe('new')->text->toBe('fixed')->revision->toBe(2);

    $this->actingAs($this->user)->patch("/highlights/{$highlight->id}", ['note' => ''])->assertRedirect();

    expect($highlight->fresh()->note)->toBeNull();
});

test('a highlight can be deleted from the stash page', function () {
    $highlight = StashHighlight::factory()->onStash($this->stash)->create();

    $this
        ->actingAs($this->user)
        ->followingRedirects()
        ->from("/stashes/{$this->stash->id}")
        ->delete("/highlights/{$highlight->id}")
        ->assertInertia(
            fn (AssertableInertia $page) => $page->component('stashes/show')->has(
                'detail.highlights',
                0,
            )->hasFlash('toast', [
                'type' => 'success',
                'message' => 'Highlight deleted.',
                'undo_url' => null,
            ]),
        );

    expect(StashHighlight::count())->toBe(0);
});

test('guests cannot touch highlights', function () {
    $highlight = StashHighlight::factory()->onStash($this->stash)->create();

    $this->patch("/highlights/{$highlight->id}", ['note' => 'x'])->assertRedirect('/login');
    $this->delete("/highlights/{$highlight->id}")->assertRedirect('/login');
});
