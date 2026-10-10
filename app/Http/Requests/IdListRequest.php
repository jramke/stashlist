<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * A request that carries an ordered list of ids: the stashes of a collection (stash_ids), the collections of
 * a stash (collection_ids) or the order of the collections themselves (ids). The key is the first of those
 * that the controller asks for.
 */
final class IdListRequest extends FormRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'stash_ids' => ['sometimes', 'array', 'max:5000'],
            'stash_ids.*' => ['integer', 'min:1'],
            'collection_ids' => ['sometimes', 'array', 'max:200'],
            'collection_ids.*' => ['integer', 'min:1'],
            'ids' => ['sometimes', 'array', 'max:200'],
            'ids.*' => ['integer', 'min:1'],
        ];
    }

    /**
     * @return list<int>
     */
    public function ids(string $key): array
    {
        return array_values(array_map(intval(...), $this->array($key)));
    }
}
