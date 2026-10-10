<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Support\CleanText;
use Illuminate\Foundation\Http\FormRequest;

/**
 * What can change about a highlight afterwards: its note and its color. The passage itself is fixed; a
 * different passage is a different highlight. Both the web app and the API use it.
 */
final class UpdateHighlightRequest extends FormRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'color' => ['sometimes', 'nullable', 'string', 'max:16', 'regex:/^(#[0-9a-fA-F]{3,8}|[a-z]{3,16})$/'],
            'note' => ['sometimes', 'nullable', 'string', 'max:'.config()->integer('stashlist.highlights.max_note')],
        ];
    }

    /**
     * Only what was sent: a missing key leaves the field alone, an empty one clears it.
     *
     * @return array<string, string|null>
     */
    public function changes(): array
    {
        $changes = [];

        if ($this->has('color')) {
            $changes['color'] = $this->filled('color') ? $this->string('color')->toString() : null;
        }

        if ($this->has('note')) {
            $changes['note'] = $this->filled('note') ? CleanText::nullable($this->string('note')->toString()) : null;
        }

        return $changes;
    }
}
