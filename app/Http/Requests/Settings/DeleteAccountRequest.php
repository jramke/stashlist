<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\User;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Lang;
use Illuminate\Support\Str;

/**
 * Deleting an account is asked for twice: with the password, or for an account that has none (it signs in with
 * GitHub or Google), by typing the email address.
 */
final class DeleteAccountRequest extends FormRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        $user = Auth::user();

        return [
            'confirmation' => [
                'required',
                'string',
                function (string $attribute, mixed $value, Closure $fail) use ($user): void {
                    if (! $user instanceof User || ! $this->matches($user, (string)$value)) {
                        $fail(
                            $user instanceof User && $user->password === null
                                ? Lang::string('That is not your email address.')
                                : Lang::string('That is not your password.'),
                        );
                    }
                },
            ],
        ];
    }

    private function matches(User $user, string $given): bool
    {
        return $user->password === null
            ? Str::lower(trim($given)) === Str::lower($user->email)
            : Hash::check($given, $user->password);
    }
}
