<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

use App\Enums\SearchMode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The query of GET /api/v1/stashes: an optional text, how many to return, and whether to search by meaning too.
 */
final class ListStashesRequest extends FormRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:200'],
            'limit' => ['nullable', 'integer', 'between:1,50'],
            'mode' => ['nullable', Rule::enum(SearchMode::class)],
        ];
    }

    public function text(): string
    {
        return trim($this->string('q')->toString());
    }

    public function limit(): int
    {
        return $this->integer('limit', default: 20);
    }

    public function mode(): SearchMode
    {
        return SearchMode::tryFrom($this->string('mode')->toString()) ?? SearchMode::Hybrid;
    }
}
