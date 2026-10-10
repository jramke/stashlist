<?php

declare(strict_types=1);

use App\Ai\Embedding\Embedders;
use App\Models\Stash;
use App\Models\User;
use App\Search\Eval\EvalCase;
use App\Search\Eval\EvalScore;
use App\Search\Eval\SearchEval;
use Tests\Support\FakeAi;
use Tests\Support\FakeSearchEngine;
use Tests\Support\SpyEmbedder;

beforeEach(function () {
    FakeAi::install();
    $this->embedder = new SpyEmbedder;
    app()->instance(Embedders::class, new Embedders(['text_v1' => $this->embedder]));
    $this->engine = FakeSearchEngine::install();
    $this->user = User::factory()->create();
});

test('recall is the share of the expected stashes within the first k', function () {
    $score = new EvalScore(
        [new EvalCase('a', [1, 2]), new EvalCase('b', [3])],
        [[9, 1, 8, 7, 6, 5, 2], [4, 5, 6, 7, 8, 9, 10, 11, 3]],
    );

    expect($score->recallAt(5))
        ->toBe(0.25)
        ->and($score->recallAt(10))
        ->toBe(1.0);
});

test('the reciprocal rank is one over the place of the first expected stash', function () {
    $score = new EvalScore(
        [new EvalCase('a', [1]), new EvalCase('b', [2]), new EvalCase('c', [3])],
        [[9, 1], [2], [7, 8]],
    );

    expect($score->meanReciprocalRank())->toBe((0.5 + 1.0 + 0.0) / 3);
});

test('a query where nothing expected is in the first ten is a miss', function () {
    $score = new EvalScore([new EvalCase('a', [1]), new EvalCase('b', [2])], [[1], [5, 6]]);

    expect($score->misses())->toHaveCount(1)->and($score->misses()[0]['case']->query)->toBe('b');
});

test('an empty eval set scores zero without dividing by it', function () {
    expect(new EvalScore([], [])->recallAt(5))->toBe(0.0);
});

test('the eval set is read from a file and bad entries are left out', function () {
    $path = tempnam(sys_get_temp_dir(), 'eval');
    file_put_contents($path, json_encode([
        ['q' => 'sourdough', 'expect' => [1, '2']],
        ['q' => 'no expectations'],
        'nonsense',
    ]));

    $cases = app(SearchEval::class)->load($path);

    expect($cases)->toHaveCount(1)->and($cases[0]->expected)->toBe([1, 2]);
    expect(fn () => app(SearchEval::class)->load('/does/not/exist.json'))->toThrow(RuntimeException::class);
});

test('the command scores keyword and hybrid and names the queries that found nothing', function () {
    $found = Stash::factory()->for($this->user)->create();
    $lost = Stash::factory()->for($this->user)->create();
    $this->engine->hits = [$found->id];
    $path = tempnam(sys_get_temp_dir(), 'eval');
    file_put_contents($path, json_encode([
        ['q' => 'finds it', 'expect' => [$found->id]],
        ['q' => 'does not find it', 'expect' => [$lost->id]],
    ]));

    $this
        ->artisan('stashlist:search-eval', ['--user' => $this->user->id, '--file' => $path])
        ->expectsOutputToContain('"does not find it" expected '.$lost->id)
        ->expectsTable(['Mode', 'Recall@5', 'Recall@10', 'MRR', 'Misses'], [
            ['keyword', '0.50', '0.50', '0.50', 1],
            ['hybrid',  '0.50', '0.50', '0.50', 1],
        ])
        ->assertSuccessful();

    // Hybrid asked for the meaning of both queries; keyword asked for none.
    expect($this->embedder->calls)->toHaveCount(2);
});

test('the command can compare settings: an embedder, a ratio and a threshold', function () {
    $stash = Stash::factory()->for($this->user)->create();
    $path = tempnam(sys_get_temp_dir(), 'eval');
    file_put_contents($path, json_encode([['q' => 'sourdough starter recipe', 'expect' => [$stash->id]]]));

    $this->artisan('stashlist:search-eval', [
        '--user' => $this->user->id,
        '--file' => $path,
        '--mode' => 'hybrid',
        '--ratio' => '0.9',
        '--threshold' => '0.1',
    ])->assertSuccessful();

    $options = $this->engine->searches[0]->options;

    expect($options['hybrid']['semanticRatio'])->toBe(0.9)->and($options['rankingScoreThreshold'])->toBe(0.1);
});

test('the command stops without a user, a file or any query', function () {
    $this->artisan('stashlist:search-eval')->assertFailed();
    $this->artisan('stashlist:search-eval', ['--user' => $this->user->id, '--file' => '/nope.json'])->assertFailed();

    $path = tempnam(sys_get_temp_dir(), 'eval');
    file_put_contents($path, '[]');

    $this->artisan('stashlist:search-eval', ['--user' => $this->user->id, '--file' => $path])->assertFailed();
});
