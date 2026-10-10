<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Tag;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

final class MergeTagRequest extends FormRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        $tag = $this->route('tag');

        return [
            // Another tag of the same user: an id of someone else's is as unknown as one that does not exist.
            'into' => [
                'required',
                'integer',
                Rule::exists('tags', 'id')->where('user_id', Auth::id()),
                Rule::notIn([$tag instanceof Tag ? $tag->id : 0]),
            ],
        ];
    }

    public function target(): int
    {
        return $this->integer('into');
    }
}
