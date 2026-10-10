<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

use App\Highlights\NewHighlight;
use App\Support\CleanText;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

/**
 * The body of a new highlight (plan 6.3). The passage and its context come from a page the client is looking
 * at and are cleaned before they are kept; the offset and the range are hints and only checked for size.
 */
class StoreHighlightRequest extends FormRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'text' => ['required', 'string', 'max:'.config()->integer('stashlist.highlights.max_text')],
            'prefix' => ['nullable', 'string', 'max:'.config()->integer('stashlist.highlights.max_context')],
            'suffix' => ['nullable', 'string', 'max:'.config()->integer('stashlist.highlights.max_context')],
            'start_offset' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'range_hint' => [
                'nullable',
                'array',
                static function (string $attribute, mixed $value, Closure $fail): void {
                    if (is_array($value) && strlen((string)json_encode($value)) > 2000) {
                        $fail("The {$attribute} may not be larger than 2000 bytes.");
                    }
                },
            ],
            'color' => ['nullable', 'string', 'max:16', 'regex:/^(#[0-9a-fA-F]{3,8}|[a-z]{3,16})$/'],
            'note' => ['nullable', 'string', 'max:'.config()->integer('stashlist.highlights.max_note')],
        ];
    }

    public function highlight(): NewHighlight
    {
        return new NewHighlight(
            text: CleanText::of($this->string('text')->toString()),
            prefix: CleanText::of($this->string('prefix')->toString()),
            suffix: CleanText::of($this->string('suffix')->toString()),
            startOffset: $this->filled('start_offset') ? $this->integer('start_offset') : null,
            rangeHint: $this->has('range_hint') ? $this->array('range_hint') : null,
            color: $this->filled('color') ? $this->string('color')->toString() : null,
            note: CleanText::nullable($this->filled('note') ? $this->string('note')->toString() : null),
        );
    }
}
