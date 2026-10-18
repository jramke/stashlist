<?php

declare(strict_types=1);

use App\Ai\Agents\StashEnricher;
use App\Enums\AiStage;
use App\Enums\AiStatus;
use App\Enums\FileRole;
use App\Enums\StashType;
use App\Jobs\GenerateEnrichment;
use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Storage\Blob;
use App\Storage\StashStorage;
use Illuminate\Support\Facades\Storage;
use Laravel\Ai\Files\Base64Image;
use Laravel\Ai\Prompts\AgentPrompt;
use Tests\Support\FakeAi;
use Tests\Support\Images;

beforeEach(function () {
    Storage::fake();
});

/**
 * An image stash after extraction: the original and the preview are stored.
 */
function picture_stash(string $left = 'red'): Stash
{
    $stash = Stash::factory()->create([
        'type' => StashType::Image,
        'url' => null,
        'url_hash' => null,
        'domain' => null,
        'title' => null,
    ]);
    $storage = app(StashStorage::class);
    $original = Images::make('png', width: 400, height: 300, left: $left);
    $storage->store($stash, FileRole::Original, new Blob($original, 'image/png', 400, 300));
    $storage->store(
        $stash,
        FileRole::Preview,
        new Blob(Images::make('webp', width: 400, height: 300, left: $left), 'image/webp', 400, 300),
    );
    StashEnrichment::query()->create(['stash_id' => $stash->id, 'user_id' => $stash->user_id, 'extracted_at' => now()]);

    return $stash;
}

function read_picture(Stash $stash): void
{
    dispatch_sync(new GenerateEnrichment($stash->id, $stash->user_id));
}

test('the model is sent the picture itself and answers with what is in it and the text on it', function () {
    FakeAi::install([FakeAi::answer([
        'title' => 'Red sneakers on a shelf',
        'summary' => 'A pair of red running sneakers on a white shelf.',
        'tags' => ['sneakers', 'red', 'shoes', 'footwear'],
        'subtype' => 'product',
        'objects' => ['sneaker', 'shelf', 'Sneaker', 'price tag'],
        'ocr_text' => "SALE\n  50% off  ",
    ])]);
    $stash = picture_stash();

    read_picture($stash);

    StashEnricher::assertPrompted(function (AgentPrompt $prompt): bool {
        $picture = $prompt->attachments->first();

        return (
            $prompt->attachments->count() === 1 &&
            $picture instanceof Base64Image &&
            $picture->mime === 'image/webp' &&
            str_contains($prompt->prompt, 'Kind of item: image') &&
            str_contains($prompt->prompt, 'The picture is attached.')
        );
    });

    $enrichment = StashEnrichment::findOrFail($stash->id);
    $stash->refresh();

    expect($enrichment->summary)
        ->toBe('A pair of red running sneakers on a white shelf.')
        ->and($enrichment->objects)
        ->toBe(['sneaker', 'shelf', 'price tag'])
        ->and($enrichment->ocr_text)
        ->toBe("SALE\n  50% off")
        ->and($enrichment->title)
        ->toBe('Red sneakers on a shelf')
        ->and($stash->subtype)
        ->toBe('product')
        ->and($stash->visibleTags->pluck('name')->all())
        ->toEqualCanonicalizing(['sneakers', 'red', 'shoes', 'footwear'])
        ->and($stash->ai_status)
        ->toBe(AiStatus::Processing);
});

test('a picture needs its two tags like a page does, however little text it has', function () {
    FakeAi::install([FakeAi::answer(['tags' => ['sneakers']]), FakeAi::answer()]);
    $stash = picture_stash();

    read_picture($stash);

    StashEnricher::assertPromptedTimes(2);
    StashEnricher::assertPrompted(fn (AgentPrompt $prompt): bool => str_contains(
        $prompt->prompt,
        'Give at least 2 tags',
    ));
});

test('the same picture is not sent twice, another picture is', function () {
    FakeAi::install([FakeAi::answer(), FakeAi::answer(['summary' => 'A different picture.'])]);
    $stash = picture_stash();

    read_picture($stash);
    read_picture($stash);
    StashEnricher::assertPromptedTimes(1);

    // The picture was replaced: the original has another hash.
    app(StashStorage::class)->store(
        $stash,
        FileRole::Original,
        new Blob(Images::make('png', width: 400, height: 300, left: 'green'), 'image/png', 400, 300),
    );

    read_picture($stash);

    StashEnricher::assertPromptedTimes(2);
});

test('text found on a picture goes into the search document', function () {
    FakeAi::install([FakeAi::answer(['objects' => ['sign'], 'ocr_text' => 'Closed on Mondays'])]);
    $stash = picture_stash();

    read_picture($stash);

    $document = $stash->fresh()->load(Stash::SEARCH_RELATIONS)->toSearchableArray();

    expect($document)->toMatchArray(['ocr_text' => 'Closed on Mondays', 'objects' => ['sign']]);
});

test('an image stash whose picture is gone fails instead of asking the model blind', function () {
    FakeAi::install();
    $stash = picture_stash();
    $stash->files()->where('role', FileRole::Preview->value)->delete();

    read_picture($stash);

    StashEnricher::assertNeverPrompted();

    $stash->refresh();

    expect($stash->ai_status)->toBe(AiStatus::Failed)->and($stash->ai_stage)->toBe(AiStage::Enrich);
});

test('an answer with too many objects or too much text is cut to the limits', function () {
    FakeAi::install([FakeAi::answer([
        'objects' => str_split('abcdefghijklmnopqrstuvwxyz'),
        'ocr_text' => str_repeat('x', 6000),
    ])]);
    $stash = Stash::factory()
        ->note()
        ->create(['body' => 'A long enough note about sourdough starters and how to feed them every day.']);

    read_picture($stash);

    $enrichment = StashEnrichment::findOrFail($stash->id);

    expect($enrichment->objects)
        ->toHaveCount(12)
        ->and(mb_strlen((string)$enrichment->ocr_text))
        ->toBe(5000);
});
