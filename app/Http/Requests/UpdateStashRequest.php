<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\StashType;
use App\Models\Stash;
use App\Support\InputClassifier;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateStashRequest extends FormRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'nullable', 'string', 'max:500'],
            'body' => ['sometimes', 'nullable', 'string', 'max:100000'],
        ];
    }

    /**
     * A color stash keeps a valid CSS color in its body, and a note keeps some text.
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $stash = $this->route('stash');

                if (! $stash instanceof Stash || ! $this->has('body')) {
                    return;
                }

                $body = $this->string('body')->toString();

                if (
                    $stash->type === StashType::Color &&
                    new InputClassifier()->classify($body)->type !== StashType::Color
                ) {
                    $validator->errors()->add('body', 'This is not a color.');
                }

                if ($stash->type === StashType::Note && $body === '') {
                    $validator->errors()->add('body', 'A note cannot be empty.');
                }
            },
        ];
    }

    /**
     * Only what was sent: a missing key leaves the field alone, an empty title clears it.
     *
     * @return array<string, mixed>
     */
    public function changes(): array
    {
        /** @var array<string, mixed> $validated */
        $validated = $this->validated();

        return array_intersect_key($validated, array_flip(['title', 'body']));
    }
}
