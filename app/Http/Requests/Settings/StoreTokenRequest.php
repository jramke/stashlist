<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class StoreTokenRequest extends FormRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return ['name' => ['required', 'string', 'max:100']];
    }

    /**
     * @return list<callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var User|null $user */
                $user = $this->user();

                if (
                    $user instanceof User &&
                    $user->tokens()->count() >= config()->integer('stashlist.api.max_tokens_per_user')
                ) {
                    $validator->errors()->add('name', 'You have as many tokens as are allowed. Revoke one first.');
                }
            },
        ];
    }
}
