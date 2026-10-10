<?php

declare(strict_types=1);

use App\Enums\AiStatus;
use App\Enums\StashType;
use App\Import\ImportOldSaves;
use App\Import\OldDump;
use App\Jobs\ExtractContent;
use App\Jobs\IndexStash;
use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Models\User;
use Illuminate\Support\Facades\Queue;
use Tests\Support\FakeSearchEngine;

const OLD_DUMP = __DIR__.'/../../fixtures/old-dump.sql';

beforeEach(function () {
    Queue::fake();
    $this->engine = FakeSearchEngine::install();
    $this->user = User::factory()->create();
});

function import_old(User $user, string $oldUser = 'u1'): App\Import\ImportReport
{
    return resolve(ImportOldSaves::class)->import($user, new OldDump(OLD_DUMP)->saves($oldUser));
}

test('the saves of the old app become stashes of the user', function () {
    $report = import_old($this->user);

    expect($report->createdCount())
        ->toBe(4)
        ->and($report->createdCount(StashType::Link))
        ->toBe(1)
        ->and($report->createdCount(StashType::Note))
        ->toBe(1)
        ->and($report->createdCount(StashType::Image))
        ->toBe(1)
        ->and($report->createdCount(StashType::Color))
        ->toBe(1)
        ->and(Stash::query()->where('user_id', $this->user->id)->count())
        ->toBe(4);
});

test('a link keeps its title, description, favicon and date', function () {
    import_old($this->user);

    $link = Stash::query()->where('type', StashType::Link->value)->sole();

    expect($link)
        ->title->toBe('An article')
        ->url->toBe('https://www.Example.com/post?utm_source=newsletter')
        ->domain->toBe('example.com')
        ->ai_status->toBe(AiStatus::Skipped)
        ->user_id->toBe($this->user->id)->and($link->meta)->toBe([
            'import_id' => 'w1',
            'favicon_url' => 'https://www.example.com/favicon.ico',
        ])->and($link->created_at->toIso8601String())->toBe(
            '2024-03-01T10:00:00+00:00',
        )->and($link->content_hash)->toHaveLength(
            64,
        )->and(StashEnrichment::query()->findOrFail($link->id)->description)->toBe('About things');
});

test('notes, images and colors map as the old app stored them', function () {
    import_old($this->user);

    $note = Stash::query()->where('type', StashType::Note->value)->sole();
    $image = Stash::query()->where('type', StashType::Image->value)->sole();
    $color = Stash::query()->where('type', StashType::Color->value)->sole();

    expect($note)
        ->title->toBeNull()
        ->body->toBe('remember the milk')
        ->url->toBeNull()->and($note->created_at->toIso8601String())->toBe('2024-03-02T08:30:00+00:00')->and($image)
        ->title->toBe('cat')
        ->body->toBe('my cat')
        ->url->toBe('https://images.example.com/cat.jpg')
        ->domain->toBe('images.example.com')->and($color)
        ->body->toBe('#e63946')
        ->title->toBe('brand red')->and($color->meta)->toBe(['import_id' => 'c1']);
});

test('what cannot become a stash is skipped and counted by reason', function () {
    $report = import_old($this->user);

    expect($report->skippedByReason())->toEqual([
        'no valid date' => 1,
        'no url' => 2,
        'not a web url' => 1,
        'empty text' => 1,
        'not a color' => 1,
        'unknown type' => 1,
    ]);
});

test('importing twice changes nothing the second time', function () {
    import_old($this->user);
    $second = import_old($this->user);

    expect($second->createdCount())
        ->toBe(0)
        ->and($second->existingCount())
        ->toBe(5)
        ->and(Stash::query()->count())
        ->toBe(4);
});

test('the same page saved twice is one link, the earliest one', function () {
    $report = import_old($this->user);

    expect($report->existingCount(StashType::Link))
        ->toBe(1)
        ->and(Stash::query()->where('type', 'link')->sole()->meta['import_id'])
        ->toBe('w1');
});

test('a link the user has saved here already is not imported again', function () {
    Stash::factory()->for($this->user)->create([
        'url' => 'https://www.example.com/post',
        'url_hash' => App\Support\UrlNormalizer::hash('https://www.example.com/post'),
    ]);

    $report = import_old($this->user);

    expect($report->existingCount(StashType::Link))->toBe(2)->and($report->createdCount(StashType::Link))->toBe(0);
});

test('every new link and image goes through the pipeline, notes and colors only to the index', function () {
    import_old($this->user);

    Queue::assertPushed(ExtractContent::class, 2);
    Queue::assertPushedWithChain(ExtractContent::class, [IndexStash::class]);
    Queue::assertPushed(IndexStash::class, 2);
    expect($this->engine->documents)->toBeEmpty();
});

test('a dry run writes nothing and reports what would happen', function () {
    $report = resolve(ImportOldSaves::class)->preview($this->user, new OldDump(OLD_DUMP)->saves('u1'));

    expect($report->createdCount())
        ->toBe(4)
        ->and($report->existingCount())
        ->toBe(1)
        ->and(Stash::query()->count())
        ->toBe(0);
    Queue::assertNothingPushed();
});

test('only the chosen old user is imported, into the chosen user', function () {
    $other = User::factory()->create();

    import_old($other, 'u2');

    expect(Stash::query()->where('user_id', $other->id)->pluck('url')->all())
        ->toBe(['https://other.example/'])
        ->and(Stash::query()->where('user_id', $this->user->id)->count())
        ->toBe(0);
});

test('the dump tells which old user to take', function () {
    $dump = new OldDump(OLD_DUMP);

    expect($dump->ownerFor('u1'))->toBe('u1');
    expect(fn () => $dump->ownerFor(null))
        ->toThrow(
            RuntimeException::class,
            'Pass one with --old-user: u1 (Joost, 12 saves); u2 (Somebody Else, 1 saves)',
        );
    expect(fn () => $dump->ownerFor('nobody'))->toThrow(RuntimeException::class, 'no saves of the user nobody');
});

test('a file that is not a dump of the old app is refused', function () {
    file_put_contents($path = tempnam(sys_get_temp_dir(), 'dump'), 'CREATE TABLE things (id integer);');

    expect(fn () => new OldDump($path))->toThrow(RuntimeException::class, 'not a dump of the old app');
    expect(fn () => new OldDump('/nonexistent/dump.sql'))->toThrow(RuntimeException::class, 'Cannot read');

    unlink($path);
});
