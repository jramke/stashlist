<?php

declare(strict_types=1);

namespace App\Extraction;

/**
 * A price a page states: the amount as digits with a dot (text, never a float: nothing is calculated with it) and
 * its ISO 4217 currency code when the page gives one.
 */
final readonly class Price
{
    private const DOT = '.';

    private const COMMA = ',';

    private const NOT_PART_OF_A_PRICE = '/[^\d.,]/';

    public function __construct(
        public string $amount,
        public ?string $currency,
    ) {}

    /**
     * @param  mixed  $amount  what the page says: a number, or text such as "39.90", "1.299,00" or "€ 12,-"
     * @param  mixed  $currency  what the page says, kept only when it is a three-letter code
     */
    public static function tryFrom(mixed $amount, mixed $currency = null): ?self
    {
        $normalized = self::normalize($amount);

        if ($normalized === null) {
            return null;
        }

        $code = is_string($currency) && preg_match('/^[A-Za-z]{3}$/', trim($currency)) === 1
            ? strtoupper(trim($currency))
            : null;

        return new self($normalized, $code);
    }

    /**
     * @return array{amount: string, currency: string|null}
     */
    public function toArray(): array
    {
        return ['amount' => $this->amount, 'currency' => $this->currency];
    }

    /**
     * Digits and a dot, or null when the text is no price or the price is nothing.
     */
    private static function normalize(mixed $value): ?string
    {
        $text = match (true) {
            is_int($value), is_float($value) => rtrim(
                rtrim(
                    number_format(
                        num: (float)$value,
                        decimals: 4,
                        decimal_separator: self::DOT,
                        thousands_separator: '',
                    ),
                    characters: '0',
                ),
                characters: self::DOT,
            ),
            // Drops currency signs, spaces and words.
            is_string($value) => preg_replace(self::NOT_PART_OF_A_PRICE, replacement: '', subject: $value) ?? '',
            default => '',
        };

        $text = self::decimalPoint(trim($text, characters: self::DOT.self::COMMA));

        return preg_match('/^\d{1,9}(\.\d{1,4})?$/', $text) === 1 && (float)$text > 0.0 ? $text : null;
    }

    /**
     * 1.299,00 and 1,299.00 both mean one thousand two hundred ninety-nine: the mark that comes last is the
     * decimal one. A lone comma is a decimal mark before one or two digits (29,95) and a thousands mark before
     * three (1,299).
     */
    private static function decimalPoint(string $text): string
    {
        $comma = strrpos($text, needle: self::COMMA);
        $dot = strrpos($text, needle: self::DOT);

        return match (true) {
            $comma !== false && $dot !== false => $comma > $dot
                ? str_replace(search: self::COMMA, replace: self::DOT, subject: str_replace(
                    search: self::DOT,
                    replace: '',
                    subject: $text,
                ))
                : str_replace(search: self::COMMA, replace: '', subject: $text),
            $comma === false => $text,
            (strlen($text) - $comma - 1) === 3, substr_count($text, needle: self::COMMA) > 1 => str_replace(
                search: self::COMMA,
                replace: '',
                subject: $text,
            ),
            default => str_replace(search: self::COMMA, replace: self::DOT, subject: $text),
        };
    }
}
