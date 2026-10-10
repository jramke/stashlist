<?php

declare(strict_types=1);

namespace App\Actions\Fortify;

use App\Auth\Registration;
use App\Auth\RegistrationRefused;
use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    public function __construct(
        private readonly Registration $registration,
    ) {}

    /**
     * Validate and create a newly registered user, if registration allows it.
     *
     * @param  array<array-key, mixed>  $input
     *
     * @throws ValidationException
     */
    public function create(array $input): User
    {
        $validated = Validator::make($input, [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
            'invite' => ['nullable', 'string', 'max:64'],
        ])->validate();

        $email = (string)$validated['email'];
        $invite = is_string($validated['invite'] ?? null) ? $validated['invite'] : null;

        try {
            return $this->registration->register(
                $email,
                $invite,
                static fn (): User => User::query()->create([
                    'name' => $validated['name'],
                    'email' => $email,
                    'password' => $validated['password'],
                ]),
            );
        } catch (RegistrationRefused $refused) {
            throw ValidationException::withMessages(['email' => $refused->getMessage()]);
        }
    }
}
