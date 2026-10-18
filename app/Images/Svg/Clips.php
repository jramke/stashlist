<?php

declare(strict_types=1);

namespace App\Images\Svg;

use Closure;
use Dom\Element;

/**
 * The clip paths of an svg, written out once in front with the shapes that are left of each of them, under ids of
 * our own. A clip path with nothing left in it is no clip: what pointed at it is drawn without one.
 */
final class Clips
{
    /** @var array<string, string> the id a clip path has in the document, and the one it gets */
    private array $ids = [];

    private string $definitions = '';

    /**
     * @param  Closure(Element): string  $shapes  what is left of the content of a clip path
     */
    public function collect(Element $root, Closure $shapes): void
    {
        foreach ($root->getElementsByTagNameNS(Document::SVG, 'clipPath') as $clip) {
            $id = (string)$clip->getAttribute('id');
            $inside = $id === '' || array_key_exists($id, $this->ids) ? '' : $shapes($clip);

            if ($inside === '') {
                continue;
            }

            $this->ids[$id] = 'clip'.count($this->ids);
            $this->definitions .= "<clipPath id=\"{$this->ids[$id]}\"".Shapes::transform($clip).">{$inside}</clipPath>";
        }
    }

    /**
     * `url(#clip0)` for what a document pointed at with `url(#id)`, or null for no clip.
     */
    public function reference(string $value): ?string
    {
        $match = [];

        return preg_match('/^url\(\s*[\'"]?#([^)\'"\s]+)[\'"]?\s*\)$/', trim($value), $match) === 1 &&
        array_key_exists($match[1], $this->ids)
            ? "url(#{$this->ids[$match[1]]})"
            : null;
    }

    public function definitions(): string
    {
        return $this->definitions === '' ? '' : "<defs>{$this->definitions}</defs>";
    }
}
