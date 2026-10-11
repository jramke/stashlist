<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * The extension asks for a token through the browser's sign-in window (identity.launchWebAuthFlow). It may
 * only be sent back to the address the browser gives every extension of its own: `<id>.chromiumapp.org` in
 * Chrome and Edge, `<id>.extensions.allizom.org` in Firefox. A token never goes to any other address.
 */
final class ConnectExtensionRequest extends FormRequest
{
    private const REDIRECT = '~^https://[a-z0-9-]{16,64}\.(chromiumapp\.org|extensions\.allizom\.org)/[\w./-]*$~';

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'redirect_uri' => ['required', 'string', 'max:200', 'regex:'.self::REDIRECT],
            'state' => ['required', 'string', 'regex:/^[A-Za-z0-9_-]{16,128}$/'],
        ];
    }

    public function redirectUri(): string
    {
        return $this->string('redirect_uri')->toString();
    }

    public function state(): string
    {
        return $this->string('state')->toString();
    }

    /** The browser the extension runs in, for the name of the token and the question on the page. */
    public function browserName(): string
    {
        return str_contains($this->redirectUri(), 'allizom') ? 'Firefox' : 'Chrome';
    }
}
