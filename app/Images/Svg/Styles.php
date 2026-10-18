<?php

declare(strict_types=1);

namespace App\Images\Svg;

use Dom\Element;

/**
 * What the style sheets of an svg say, as the rules for tags, classes and ids and as the variables the rules define. A
 * style sheet can ask for nothing but how an element looks: the shape of every rule is checked, and nothing in it is
 * followed anywhere.
 */
final readonly class Styles
{
    private const MAX_BYTES = 30_000;

    private const MAX_RULES = 300;

    /**
     * @param  list<Rule>  $rules  the lighter first
     */
    private function __construct(
        private array $rules,
        public Variables $variables,
    ) {}

    public static function from(string $css): self
    {
        $rules = [];
        $variables = [];
        $comments = '~/\*.*?\*/~s';

        foreach (Css::blocks((string)preg_replace(
            $comments,
            replacement: '',
            subject: substr($css, offset: 0, length: self::MAX_BYTES),
        )) as [$selectors, $body]) {
            $declarations = Css::declarations($body);
            $custom = array_filter(
                $declarations,
                static fn (string $name): bool => str_starts_with($name, '--'),
                ARRAY_FILTER_USE_KEY,
            );
            $variables = [...$variables, ...$custom];

            foreach (explode(separator: ',', string: $selectors) as $selector) {
                $rule = Rule::from(trim($selector), array_diff_key($declarations, $custom));

                if ($rule !== null && count($rules) < self::MAX_RULES) {
                    $rules[] = $rule;
                }
            }
        }

        // The sort is stable: of two rules that weigh the same, the later one wins.
        usort($rules, static fn (Rule $a, Rule $b): int => $a->weight <=> $b->weight);

        return new self($rules, new Variables($variables));
    }

    /**
     * What the rules say about an element, the heavier over the lighter.
     *
     * @return array<string, string>
     */
    public function for(Element $element): array
    {
        $matching = array_filter($this->rules, static fn (Rule $rule): bool => $rule->matches($element));

        return array_merge([], ...array_map(static fn (Rule $rule): array => $rule->declarations, $matching));
    }
}
