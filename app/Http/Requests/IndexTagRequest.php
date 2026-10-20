<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class IndexTagRequest extends FormRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1', 'max:100000'],
        ];
    }

    /** The words to look for in a tag's name, or null. */
    public function search(): ?string
    {
        $text = trim($this->string('q')->toString());

        return $text === '' ? null : $text;
    }
}
