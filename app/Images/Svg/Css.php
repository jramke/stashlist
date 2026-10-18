<?php

declare(strict_types=1);

namespace App\Images\Svg;

/**
 * The two shapes of CSS an icon holds: the `name: value` pairs of a style attribute or a rule, and the blocks of a style
 * sheet. Nothing here runs or fetches anything; the text is only cut into pieces.
 */
final class Css
{
    /** At-rules whose rules apply: the light scheme (the app is light), and plain screen media. */
    private const APPLIED_MEDIA = '/^@media\s*(?:\(\s*prefers-color-scheme\s*:\s*light\s*\)|screen|all)$/i';

    /**
     * The pairs of a style attribute or of the body of a rule. Of a name that comes twice the later one counts, and
     * `!important` is no more than a word after the value.
     *
     * @return array<string, string>
     */
    public static function declarations(string $body): array
    {
        $pairs = [];
        preg_match_all('/(--[\w-]+|[a-z-]+)\s*:\s*([^;!]+)/i', $body, $pairs, PREG_SET_ORDER);

        return array_combine(
            array_map(
                static fn (string $name): string => str_starts_with($name, '--') ? $name : strtolower($name),
                array_column($pairs, 1),
            ),
            array_map(trim(...), array_column($pairs, 2)),
        );
    }

    /**
     * The rules of a style sheet, each as its selectors and its body. The rules of an at-rule that applies are among
     * them; every other at-rule (`@import`, `@font-face`, `@keyframes`, the dark scheme) is left out.
     *
     * @return list<array{string, string}>
     */
    public static function blocks(string $css, int $depth = 0): array
    {
        $found = [];
        preg_match_all('/([^{};]+)\{((?:[^{}]|\{[^{}]*\})*)\}/', $css, $found, PREG_SET_ORDER);
        $blocks = [];

        foreach ($found as [, $prelude, $body]) {
            $prelude = trim($prelude);

            if (! str_starts_with($prelude, '@')) {
                $blocks[] = [$prelude, $body];

                continue;
            }

            if ($depth === 0 && preg_match(self::APPLIED_MEDIA, $prelude) === 1) {
                $blocks = [...$blocks, ...self::blocks($body, depth: 1)];
            }
        }

        return $blocks;
    }
}
