<?php

declare(strict_types=1);

use App\Enums\ExportStatus;
use App\Enums\FileRole;
use App\Jobs\BuildExport;
use App\Jobs\DeleteExpiredExports;
use App\Models\Collection;
use App\Models\Export;
use App\Models\Stash;
use App\Models\StashEmbedding;
use App\Models\StashEnrichment;
use App\Models\StashHighlight;
use App\Models\User;
use App\Storage\Blob;
use App\Storage\StashStorage;
use App\Tags\TagSync;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Images;

beforeEach(function () {
    Storage::fake();

    $this->user = User::factory()->create(['name' => 'Ada', 'email' => 'ada@example.com']);
});

/**
 * Reads the finished export of a user: its JSON and the names of everything in the zip.
 *
 * @return array{json: array<string, mixed>, names: list<string>, zip: ZipArchive}
 */
function opened(Export $export): array
{
    $local = tempnam(sys_get_temp_dir(), 'export').'.zip';
    file_put_contents($local, Storage::get((string)$export->path));

    $zip = new ZipArchive;
    $zip->open($local);
    $names = [];

    for ($i = 0; $i < $zip->numFiles; $i++) {
        $names[] = (string)$zip->getNameIndex($i);
    }

    return ['json' => json_decode((string)$zip->getFromName('stashlist.json'), true), 'names' => $names, 'zip' => $zip];
}

function build_export(User $user): Export
{
    $export = new Export;
    $export->user_id = $user->id;
    $export->save();

    dispatch_sync(new BuildExport($export->id, $user->id));

    return $export->refresh();
}

test('an export holds the account, the stashes with everything on them, and the files', function () {
    $stash = Stash::factory()->for($this->user)->create([
        'title' => 'Sourdough',
        'url' => 'https://bakeclub.example/a',
    ]);
    StashEnrichment::query()->create([
        'stash_id' => $stash->id,
        'user_id' => $this->user->id,
        'summary' => 'About starters.',
        'extracted_text' => 'A living culture.',
        'color_names' => ['red'],
        'objects' => ['jar'],
    ]);
    app(TagSync::class)->addByUser($stash, 'baking');
    StashHighlight::factory()->onStash($stash)->create(['text' => 'living culture', 'note' => 'nice']);
    $collection = Collection::factory()->for($this->user)->create(['name' => 'Bread']);
    $stash->collections()->attach($collection->id, ['user_id' => $this->user->id, 'created_at' => now()]);
    $png = Images::make('png', width: 20, height: 20);
    app(StashStorage::class)->store($stash, FileRole::Original, new Blob($png, 'image/png', 20, 20));
    app(StashStorage::class)->store($stash, FileRole::Thumb, new Blob($png, 'image/png', 20, 20));

    $export = build_export($this->user);
    $contents = opened($export);
    $document = $contents['json'];

    expect($export->status)
        ->toBe(ExportStatus::Ready)
        ->and($export->stash_count)
        ->toBe(1)
        ->and($export->path)
        ->toBe("u/{$this->user->id}/exports/{$export->id}.zip")
        ->and($export->expires_at?->isFuture())
        ->toBeTrue()
        ->and($document['account'])
        ->toMatchArray(['name' => 'Ada', 'email' => 'ada@example.com'])
        ->and($document['collections'])
        ->toMatchArray([['id' => $collection->id, 'name' => 'Bread', 'description' => null]])
        ->and($document['stashes'])
        ->toHaveCount(1)
        ->and($document['stashes'][0])
        ->toMatchArray([
            'title' => 'Sourdough',
            'url' => 'https://bakeclub.example/a',
            'summary' => 'About starters.',
            'text' => 'A living culture.',
            'objects' => ['jar'],
            'colors' => ['red'],
            'collections' => [$collection->id],
        ])
        ->and($document['stashes'][0]['tags'][0])
        ->toMatchArray(['name' => 'baking', 'added_by' => 'user', 'dismissed' => false])
        ->and($document['stashes'][0]['highlights'][0])
        ->toMatchArray(['text' => 'living culture', 'note' => 'nice'])
        // The original goes in; the thumbnail is made from it and does not.
        ->and($contents['names'])
        ->toEqualCanonicalizing(['stashlist.json', "files/{$stash->id}/original.png"])
        ->and($document['stashes'][0]['files'][0])
        ->toMatchArray(['role' => 'original', 'path' => "files/{$stash->id}/original.png"])
        ->and($contents['zip']->getFromName("files/{$stash->id}/original.png"))
        ->toBe($png);
});

test('an export holds nothing of anyone else, and no vectors', function () {
    Stash::factory()->for($this->user)->create(['title' => 'Mine']);
    $theirs = Stash::factory()->create(['title' => 'Theirs']);
    StashEmbedding::query()->create([
        'stash_id' => $theirs->id,
        'embedder' => 'text_v1',
        'user_id' => $theirs->user_id,
        'model' => 'm',
        'dimensions' => 1,
        'recipe_version' => 1,
        'input_hash' => str_repeat('a', 64),
        'vector' => pack('g', 0.5),
    ]);
    Collection::factory()->create(['name' => 'Theirs too']);

    $document = opened(build_export($this->user))['json'];

    expect(array_column($document['stashes'], 'title'))
        ->toBe(['Mine'])
        ->and($document['collections'])
        ->toBeEmpty()
        ->and(json_encode($document))
        ->not->toContain('vector')
        ->not->toContain('Theirs');
});

test('a large library is written stash by stash', function () {
    Stash::factory()->count(450)->for($this->user)->create();

    $export = build_export($this->user);

    expect($export->stash_count)->toBe(450)->and(opened($export)['json']['stashes'])->toHaveCount(450);
});

test('an export of an empty library is a valid file too', function () {
    $document = opened(build_export($this->user))['json'];

    expect($document['stashes'])->toBeEmpty()->and($document['account']['email'])->toBe('ada@example.com');
});

test('a failure is recorded and the export says so', function () {
    Stash::factory()->for($this->user)->create();
    $stash = Stash::query()->firstOrFail();
    app(StashStorage::class)->store($stash, FileRole::Original, new Blob('x', 'image/png', 1, 1));
    // The stored file vanishes behind our back.
    Storage::deleteDirectory('u');

    $export = build_export($this->user);

    expect($export->status)->toBe(ExportStatus::Failed)->and($export->error)->not->toBeNull();
});

test('the page lists the exports and a person starts one from it', function () {
    Queue::fake();

    $this->actingAs($this->user)->post('/settings/export')->assertRedirect();

    $export = Export::query()->sole();

    Queue::assertPushed(
        BuildExport::class,
        fn (BuildExport $job): bool => $job->exportId === $export->id && $job->userId === $this->user->id,
    );
    $this->get('/settings/export')->assertInertia(
        fn (AssertableInertia $page) => $page
            ->component('settings/export')
            ->where('exports.0.status', 'queued')
            ->where('exports.0.downloadable', false),
    );
});

test('only one export is made at a time', function () {
    Queue::fake();

    $this->actingAs($this->user)->post('/settings/export');
    $this->post('/settings/export');

    expect(Export::query()->count())->toBe(1);
});

test('a finished export is downloaded through a temporary address', function () {
    $export = build_export($this->user);

    $response = $this->actingAs($this->user)->get("/settings/export/{$export->id}");

    $response->assertRedirect();
    expect($response->headers->get('Location'))->toContain("exports/{$export->id}.zip");
});

test('an expired or unfinished export cannot be downloaded', function () {
    $export = build_export($this->user);
    $export->forceFill(['expires_at' => now()->subMinute()])->save();
    $this->actingAs($this->user)->get("/settings/export/{$export->id}")->assertGone();

    $queued = new Export;
    $queued->user_id = $this->user->id;
    $queued->save();
    $this->get("/settings/export/{$queued->id}")->assertGone();
});

test('nobody else can download my export', function () {
    $export = build_export($this->user);

    $this->actingAs(User::factory()->create())->get("/settings/export/{$export->id}")->assertNotFound();
    auth()->logout();
    $this->get("/settings/export/{$export->id}")->assertRedirect('/login');
});

test('the hourly cleanup removes the zips whose week is over, and only those', function () {
    $old = build_export($this->user);
    $old->forceFill(['expires_at' => now()->subHour()])->save();
    $fresh = build_export($this->user);

    dispatch_sync(new DeleteExpiredExports);

    Storage::assertMissing((string)$old->path);
    Storage::assertExists((string)$fresh->path);
    expect(Export::query()->pluck('id')->all())->toBe([$fresh->id]);
});

test('exports are rate limited', function () {
    Queue::fake();

    foreach (range(1, 6) as $attempt) {
        $response = $this->actingAs($this->user)->post('/settings/export');
        // The first starts an export, the others are told one is being made; the sixth is stopped.
        $attempt < 6 ? $response->assertRedirect() : $response->assertTooManyRequests();
    }
});
