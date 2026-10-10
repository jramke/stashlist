<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

use App\Support\CleanText;

/**
 * A highlight on a page that may not be saved yet: the address and a title say which page, and the page's
 * stash is made first when the user does not have it.
 */
final class StoreUrlHighlightRequest extends StoreHighlightRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    #[\Override]
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'url' => ['required', 'string', 'max:2048', 'url:http,https'],
            'title' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function address(): string
    {
        return $this->string('url')->toString();
    }

    public function pageTitle(): ?string
    {
        return $this->filled('title') ? CleanText::nullable($this->string('title')->toString()) : null;
    }
}
