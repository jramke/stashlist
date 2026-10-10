<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Actions\Stashes\CapturePayload;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

final class StoreStashRequest extends FormRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'input' => ['nullable', 'string', 'max:100000', 'required_without:image'],
            'image' => [
                'nullable',
                'file',
                'max:20480',
                'mimetypes:image/jpeg,image/png,image/gif,image/webp,image/avif,image/heic,image/heif',
            ],
            'title' => ['nullable', 'string', 'max:500'],
            'tags' => ['nullable', 'array', 'max:20'],
            'tags.*' => ['string', 'max:100'],
            'collection_ids' => ['nullable', 'array', 'max:20'],
            'collection_ids.*' => ['integer', Rule::exists('collections', 'id')->where('user_id', Auth::id())],
        ];
    }

    public function payload(): CapturePayload
    {
        $image = $this->file('image');

        return new CapturePayload(
            input: $this->input('input') === null ? null : $this->string('input')->toString(),
            image: $image instanceof UploadedFile ? $image : null,
            title: $this->input('title') === null ? null : $this->string('title')->toString(),
            tags: array_values(array_map(strval(...), $this->array('tags'))),
            collectionIds: array_values(array_map(intval(...), $this->array('collection_ids'))),
        );
    }
}
