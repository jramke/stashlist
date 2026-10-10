<?php

declare(strict_types=1);

use App\Support\SharedInput;

test('the url field wins', function () {
    expect(SharedInput::from('A title', 'some text', 'https://example.com/a'))->toBe('https://example.com/a');
});

test('a link inside the text is found when the url field is empty, as Android shares it', function () {
    expect(SharedInput::from('', 'Great read https://example.com/b?x=1 really', ''))->toBe('https://example.com/b?x=1');
});

test('without a link the text is the note, then the title', function () {
    expect(SharedInput::from('Title', ' a thought ', null))
        ->toBe('a thought')
        ->and(SharedInput::from('Only a title', '', null))
        ->toBe('Only a title');
});

test('nothing shared gives nothing', function () {
    expect(SharedInput::from('', '  ', ''))->toBeNull();
});
