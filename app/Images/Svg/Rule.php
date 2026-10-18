<?php

declare(strict_types=1);

namespace App\Images\Svg;

use Dom\Element;

/**
 * A rule of a style sheet for one simple selector: every element (`*`), a tag, a class, an id, or the root. The heavier
 * rule beats the lighter, as in CSS.
 */
final readonly class Rule
{
    /**
     * @param  array<string, string>  $declarations
     */
    private function __construct(
        public int $weight,
        private string $kind,
        private string $name,
        public array $declarations,
    ) {}

    /**
     * The rule for a selector, or null for one that is more than a simple selector (a descendant, a pseudo class, a
     * compound), which an icon seldom needs.
     *
     * @param  array<string, string>  $declarations
     */
    public static function from(string $selector, array $declarations): ?self
    {
        if (preg_match('/^(?:\*|:root|[a-z][a-z0-9]*|\.[\w-]+|#[\w-]+)$/i', $selector) !== 1) {
            return null;
        }

        return match ($selector[0]) {
            '*' => new self(weight: 0, kind: 'any', name: '', declarations: $declarations),
            '.' => new self(weight: 10, kind: 'class', name: substr($selector, offset: 1), declarations: $declarations),
            '#' => new self(weight: 100, kind: 'id', name: substr($selector, offset: 1), declarations: $declarations),
            ':' => new self(weight: 10, kind: 'tag', name: 'svg', declarations: $declarations),
            default => new self(weight: 1, kind: 'tag', name: $selector, declarations: $declarations),
        };
    }

    public function matches(Element $element): bool
    {
        return match ($this->kind) {
            'class' => in_array(
                $this->name,
                preg_split('/\s+/', (string)$element->getAttribute('class'), flags: PREG_SPLIT_NO_EMPTY) ?: [],
                strict: true,
            ),
            'id' => $this->name === $element->getAttribute('id'),
            'tag' => $this->name === $element->localName,
            default => true,
        };
    }
}
