<?php

declare(strict_types=1);

namespace App\Highlights;

/**
 * A passage to mark, as the client describes it. The prefix and suffix are a little of the text around it;
 * together with the text they are how the extension finds the passage again. The offset and the range are
 * hints for a quicker lookup and are never trusted.
 */
final readonly class NewHighlight
{
    /**
     * @param  array<array-key, mixed>|null  $rangeHint
     */
    public function __construct(
        public string $text,
        public string $prefix = '',
        public string $suffix = '',
        public ?int $startOffset = null,
        public ?array $rangeHint = null,
        public ?string $color = null,
        public ?string $note = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function attributes(): array
    {
        return [
            'text' => $this->text,
            'prefix' => $this->prefix,
            'suffix' => $this->suffix,
            'start_offset' => $this->startOffset,
            'range_hint' => $this->rangeHint,
            'color' => $this->color,
            'note' => $this->note,
        ];
    }
}
