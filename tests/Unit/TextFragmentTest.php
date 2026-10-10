<?php

declare(strict_types=1);

use App\Support\TextFragment;

test('a short passage goes in whole, with its context', function () {
    expect(TextFragment::url(
        'https://example.com/post?a=1#old',
        'a living culture',
        'A sourdough starter is ',
        ' that you keep alive',
    ))
        ->toBe(
            'https://example.com/post?a=1#:~:text=sourdough%20starter%20is-,a%20living%20culture,-that%20you%20keep',
        );
});

test('without context there is only the passage', function () {
    expect(TextFragment::url('https://example.com/', 'just this'))->toBe('https://example.com/#:~:text=just%20this');
});

test('the context is cut to a few words next to the passage', function () {
    $url = TextFragment::url(
        'https://example.com/',
        'the passage',
        'one two three four five ',
        ' six seven eight nine ten',
    );

    expect($url)->toBe('https://example.com/#:~:text=three%20four%20five-,the%20passage,-six%20seven%20eight');
});

test('white space is collapsed and what the directive uses itself is escaped', function () {
    expect(TextFragment::url('https://example.com/', "well-known,\n  fact & fiction"))
        ->toBe('https://example.com/#:~:text=well%2Dknown%2C%20fact%20%26%20fiction');
});

test('letters of other alphabets are percent-encoded as UTF-8', function () {
    expect(TextFragment::url('https://example.com/', 'Käse über alles'))
        ->toBe('https://example.com/#:~:text=K%C3%A4se%20%C3%BCber%20alles');
});

test('a long passage is given by its beginning and its end', function () {
    $passage = implode(' ', array_map(fn (int $n): string => "word{$n}", range(1, 60)));

    $url = TextFragment::url('https://example.com/', $passage);
    [, $directive] = explode('#:~:text=', $url);
    [$start, $end] = explode(',', $directive);

    expect(rawurldecode($start))
        ->toStartWith('word1 word2')
        ->and(rawurldecode($end))
        ->toEndWith('word59 word60')
        ->and(strlen($url))
        ->toBeLessThan(200);
});
