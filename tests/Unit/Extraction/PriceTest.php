<?php

declare(strict_types=1);

use App\Extraction\Price;

test('a price is read as digits with a dot, whatever the page wrote', function (mixed $given, ?string $expected) {
    expect(Price::tryFrom($given)?->amount)->toBe($expected);
})->with([
    'plain' => ['39.90', '39.90'],
    'a float' => [39.9, '39.9'],
    'an integer' => [12, '12'],
    'a comma for the cents' => ['29,95', '29.95'],
    'dots for thousands, a comma for the cents' => ['1.299,00', '1299.00'],
    'commas for thousands, a dot for the cents' => ['1,299.00', '1299.00'],
    'a lone thousands comma' => ['1,299', '1299'],
    'two thousands commas' => ['1,299,000', '1299000'],
    'a sign and words around it' => ['€ 12,50 incl. VAT', '12.50'],
    'a dash for no cents' => ['12,-', '12'],
    'words only' => ['free', null],
    'nothing to pay' => ['0.00', null],
    'too many digits' => ['12345678901', null],
    'too many decimals' => ['1.23456', null],
    'empty' => ['', null],
    'null' => [null, null],
    'a list' => [['1'], null],
]);

test('the currency is kept only as a three-letter code', function (mixed $given, ?string $expected) {
    expect(Price::tryFrom('10', $given)?->currency)->toBe($expected);
})->with([
    'upper case' => ['EUR', 'EUR'],
    'lower case' => ['usd', 'USD'],
    'padded' => [' GBP ', 'GBP'],
    'a sign' => ['€', null],
    'a word' => ['euro', null],
    'null' => [null, null],
    'a number' => [978, null],
]);

test('a price is a small array for the meta column', function () {
    expect(Price::tryFrom('39,90', 'eur')?->toArray())->toBe(['amount' => '39.90', 'currency' => 'EUR']);
});
