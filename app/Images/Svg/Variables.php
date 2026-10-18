<?php

declare(strict_types=1);

namespace App\Images\Svg;

/**
 * The custom properties of a style sheet (`:root { --brand: #123 }`), put into the values that use them with
 * `var(--brand)`; and `light-dark(a, b)`, of which the app, being light, takes the first.
 */
final readonly class Variables
{
    /**
     * @param  array<string, string>  $values
     */
    public function __construct(
        private array $values,
    ) {}

    /**
     * The value with its functions written out, or null when a variable is left without a value.
     */
    public function resolve(string $value): ?string
    {
        $argument = '(?:[^(),]+|[a-z]+\([^()]*\))';
        $text = (string)preg_replace(
            "/light-dark\\(\\s*({$argument})\\s*,\\s*{$argument}\\s*\\)/i",
            replacement: '$1',
            subject: $value,
        );

        for ($pass = 0; $pass < 3 && str_contains($text, 'var('); $pass++) {
            $text = (string)preg_replace_callback(
                '/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/',
                fn (array $match): string => $this->values[$match[1]] ?? $match[2] ?? '',
                $text,
            );
        }

        $text = trim($text);

        return $text === '' || str_contains($text, 'var(') ? null : $text;
    }
}
