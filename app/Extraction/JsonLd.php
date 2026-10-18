<?php

declare(strict_types=1);

namespace App\Extraction;

use Dom\HTMLDocument;

/**
 * What a page says about itself in JSON-LD (schema.org), as the things it describes. The JSON comes from software
 * we do not control, so every step expects anything and is capped.
 */
final readonly class JsonLd
{
    private const MAX_NODES = 50;

    private const MAX_SCRIPTS = 10;

    private const MAX_SCRIPT_LENGTH = 200_000;

    /**
     * @param  list<array<array-key, mixed>>  $nodes  each document, and the members of its graph
     */
    private function __construct(
        public array $nodes,
    ) {}

    /**
     * The JSON-LD script tags of a page: a few of them, none of them huge.
     */
    public static function fromPage(HTMLDocument $document): self
    {
        $decoded = [];

        foreach ($document->querySelectorAll('script[type="application/ld+json"]') as $script) {
            $text = $script->textContent ?? '';

            if (count($decoded) < self::MAX_SCRIPTS && strlen($text) <= self::MAX_SCRIPT_LENGTH) {
                $decoded[] = json_decode(trim($text), associative: true);
            }
        }

        return self::fromDocuments($decoded);
    }

    /**
     * @param  array<array-key, mixed>  $documents  decoded JSON-LD: a document, or a list of them, as a client sends it
     */
    public static function fromDocuments(array $documents): self
    {
        $nodes = [];

        foreach (self::nodesIn($documents) as $document) {
            foreach (self::nodesIn($document) as $node) {
                $nodes[] = $node;
                array_push($nodes, ...self::nodesIn($node['@graph'] ?? null));
            }
        }

        return new self(array_slice($nodes, offset: 0, length: self::MAX_NODES));
    }

    /**
     * The schema.org types of the things described, lower case and without the namespace.
     *
     * @return list<string>
     */
    public function types(): array
    {
        return array_values(array_unique(array_merge(...array_map(self::typesOf(...), $this->nodes))));
    }

    /**
     * What is in a value as a list: the items of a list, an object or a single value as one item.
     *
     * @return list<mixed>
     */
    public static function asList(mixed $value): array
    {
        return is_array($value) && array_is_list($value) ? $value : [$value];
    }

    /**
     * The objects in a value: those of a list, the object itself, or none.
     *
     * @return list<array<array-key, mixed>>
     */
    public static function nodesIn(mixed $value): array
    {
        return array_values(array_filter(self::asList($value), is_array(...)));
    }

    /**
     * @param  array<array-key, mixed>  $node
     * @return list<string>
     */
    public static function typesOf(array $node): array
    {
        return array_values(array_filter(array_map(
            static fn (mixed $type): ?string => is_string($type)
                ? strtolower((string)preg_replace('~^.*[/:#]~', replacement: '', subject: $type))
                : null,
            self::asList($node['@type'] ?? null),
        )));
    }
}
