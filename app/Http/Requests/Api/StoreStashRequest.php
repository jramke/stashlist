<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

use App\Actions\Stashes\CapturedPage;
use App\Actions\Stashes\CapturePayload;
use App\Support\CleanText;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * The body of POST /api/v1/stashes (plan 6.3). The client is software we do not control, so every size is
 * capped and every string cleaned before it reaches the capture action.
 */
final class StoreStashRequest extends FormRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        $maxMarkdown = config()->integer('stashlist.api.max_markdown_bytes');

        return [
            'type' => ['nullable', Rule::in(['link', 'note', 'image', 'color'])],
            'url' => ['nullable', 'string', 'max:2048', 'url:http,https'],
            'title' => ['nullable', 'string', 'max:500'],
            'body' => ['nullable', 'string', 'max:100000'],
            'tags' => ['nullable', 'array', 'max:50'],
            'tags.*' => ['nullable', 'string', 'max:100'],
            'collection_ids' => ['nullable', 'array', 'max:50'],
            'collection_ids.*' => ['integer', Rule::exists('collections', 'id')->where('user_id', Auth::id())],
            'capture' => ['nullable', 'array'],
            'capture.source' => ['nullable', 'string', 'max:20'],
            'capture.version' => ['nullable', 'string', 'max:32'],
            'capture.content_markdown' => [
                'nullable',
                'string',
                // Bytes, not characters: 200 KB of text is 200 KB however it is encoded.
                static function (string $attribute, mixed $value, Closure $fail) use ($maxMarkdown): void {
                    if (is_string($value) && strlen($value) > $maxMarkdown) {
                        $fail("The {$attribute} may not be larger than {$maxMarkdown} bytes.");
                    }
                },
            ],
            'capture.description' => ['nullable', 'string', 'max:5000'],
            'capture.site_name' => ['nullable', 'string', 'max:200'],
            'capture.author' => ['nullable', 'string', 'max:200'],
            'capture.published' => ['nullable', 'string', 'max:40'],
            'capture.language' => ['nullable', 'string', 'regex:/^[A-Za-z]{2,3}([-_][A-Za-z0-9]{2,8})*$/', 'max:20'],
            'capture.favicon_url' => ['nullable', 'string', 'max:2048', 'url:http,https'],
            'capture.image_url' => ['nullable', 'string', 'max:2048', 'url:http,https'],
            'capture.schema_org' => [
                'nullable',
                'array',
                // The page's JSON-LD is kept for later; keep it small.
                static function (string $attribute, mixed $value, Closure $fail): void {
                    if (is_array($value) && strlen((string)json_encode($value)) > 50_000) {
                        $fail("The {$attribute} may not be larger than 50000 bytes.");
                    }
                },
            ],
            'screenshot' => [
                'nullable',
                'file',
                'mimetypes:image/webp,image/png',
                'max:'.config()->integer('stashlist.api.max_screenshot_kb'),
            ],
            'image' => [
                'nullable',
                'file',
                'mimetypes:image/jpeg,image/png,image/gif,image/webp,image/avif',
                'max:'.config()->integer('stashlist.api.max_image_kb'),
            ],
        ];
    }

    /**
     * @return list<Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $nothing =
                    trim($this->string('url')->toString()) === '' && trim($this->string('body')->toString()) === '';

                if ($nothing && ! $this->hasFile('image')) {
                    $validator->errors()->add('url', 'Send a url, a body or an image.');
                }
            },
        ];
    }

    public function payload(): CapturePayload
    {
        $type = $this->string('type')->toString();
        $url = CleanText::nullable($this->nullableString('url'));
        $body = CleanText::nullable($this->nullableString('body'));
        $image = $this->file('image');
        $screenshot = $this->file('screenshot');

        return new CapturePayload(
            // A note or a color is its text even when it looks like a link; anything else is its address.
            input: $type === 'note' || $type === 'color' ? $body ?? $url : $url ?? $body,
            image: $image instanceof UploadedFile ? $image : null,
            title: CleanText::nullable($this->nullableString('title')),
            tags: array_values(array_filter(
                array_map(
                    static fn (mixed $tag): string => CleanText::of((string)$tag),
                    $this->array('tags'),
                ),
                static fn (string $tag): bool => trim($tag) !== '',
            )),
            collectionIds: array_values(array_map(intval(...), $this->array('collection_ids'))),
            capture: $this->has('capture') ? $this->capturedPage() : null,
            screenshot: $screenshot instanceof UploadedFile ? $screenshot : null,
        );
    }

    private function capturedPage(): CapturedPage
    {
        $schema = $this->array('capture.schema_org');

        return new CapturedPage(
            source: CleanText::nullable($this->nullableString('capture.source')),
            version: CleanText::nullable($this->nullableString('capture.version')),
            contentMarkdown: CleanText::nullable($this->nullableString('capture.content_markdown')),
            description: CleanText::nullable($this->nullableString('capture.description')),
            siteName: CleanText::nullable($this->nullableString('capture.site_name')),
            author: CleanText::nullable($this->nullableString('capture.author')),
            published: CleanText::nullable($this->nullableString('capture.published')),
            language: CleanText::nullable($this->nullableString('capture.language')),
            faviconUrl: CleanText::nullable($this->nullableString('capture.favicon_url')),
            imageUrl: CleanText::nullable($this->nullableString('capture.image_url')),
            schemaOrg: $schema,
        );
    }

    private function nullableString(string $key): ?string
    {
        return $this->filled($key) ? $this->string($key)->toString() : null;
    }
}
