<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Data\FeedFiltersData;
use App\Enums\AiStatus;
use App\Enums\StashType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class IndexStashRequest extends FormRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'type' => ['nullable', Rule::enum(StashType::class)],
            'status' => ['nullable', Rule::enum(AiStatus::class)],
            'tag' => ['nullable', 'array', 'max:10'],
            'tag.*' => ['integer', 'min:1'],
            'collection' => ['nullable', 'string', 'regex:/^(none|\d+)$/'],
            'q' => ['nullable', 'string', 'max:200'],
            // The as-you-type pair: "keyword" answers fast, "hybrid" follows once the user paused. Until
            // embeddings exist both are a keyword search.
            'mode' => ['nullable', Rule::in(['keyword', 'hybrid'])],
        ];
    }

    public function filters(): FeedFiltersData
    {
        $collection = $this->string('collection')->toString();
        $text = trim($this->string('q')->toString());

        return new FeedFiltersData(
            type: StashType::tryFrom($this->string('type')->toString()),
            tags: array_values(array_map(intval(...), $this->array('tag'))),
            collection: $collection === '' ? null : $collection,
            status: AiStatus::tryFrom($this->string('status')->toString()),
            q: $text === '' ? null : $text,
        );
    }
}
