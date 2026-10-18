<?php

declare(strict_types=1);

namespace App\Images\Svg;

/**
 * A `fill` or a `stroke` written as a color or as `none`. A gradient of this document is the one color it comes to;
 * anything else a paint points at (another document, a file, an address) is never followed: it is the fallback the
 * paint names, or no paint at all.
 */
final readonly class Paint
{
    public function __construct(
        private Gradients $gradients,
    ) {}

    /**
     * Null for a paint to leave out, which makes the element take its parent's.
     */
    public function of(string $value): ?string
    {
        $reference = [];

        if (preg_match('/^url\(\s*[\'"]?([^)\'"\s]*)[\'"]?\s*\)\s*(.*)$/s', trim($value), $reference) !== 1) {
            return self::plain($value);
        }

        $gradient = str_starts_with($reference[1], '#')
            ? $this->gradients->color(substr($reference[1], offset: 1))
            : null;

        return $gradient ?? self::plain($reference[2]) ?? 'none';
    }

    private static function plain(string $value): ?string
    {
        return match (strtolower(trim($value))) {
            'none', 'transparent' => 'none',
            'currentcolor' => '#000000',
            default => Color::of($value),
        };
    }
}
