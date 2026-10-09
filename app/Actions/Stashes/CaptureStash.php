<?php

declare(strict_types=1);

namespace App\Actions\Stashes;

use App\Collections\CollectionSync;
use App\Enums\AiStatus;
use App\Enums\FileRole;
use App\Images\InvalidImage;
use App\Models\Stash;
use App\Models\User;
use App\Pipeline\ContentHash;
use App\Pipeline\StartPipeline;
use App\Storage\Blob;
use App\Storage\StashStorage;
use App\Tags\TagSync;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Saves something for a user: the single entry point for the web form, and later the API and the extension.
 *
 * It decides what the input is, returns the existing stash when a link was saved before, creates the stash
 * with its tags and collections, stores an uploaded original and starts the pipeline.
 */
final readonly class CaptureStash
{
    public function __construct(
        private StashDraftFactory $drafts,
        private StashStorage $storage,
        private TagSync $tags,
        private CollectionSync $collections,
        private StartPipeline $pipeline,
    ) {}

    /**
     * @throws InvalidArgumentException when there is nothing to save
     * @throws InvalidImage when an upload is not an image we accept
     */
    public function capture(User $user, CapturePayload $payload): CaptureResult
    {
        $draft = $this->drafts->fromPayload($payload);

        $existing = $this->existing($user, $draft);

        if ($existing !== null) {
            return new CaptureResult($existing, created: false);
        }

        try {
            /** @var Stash $stash */
            $stash = DB::transaction(fn (): Stash => $this->create($user, $payload, $draft));
        } catch (UniqueConstraintViolationException $exception) {
            // The same link was saved by a parallel request a moment ago.
            return new CaptureResult($this->existing($user, $draft) ?? throw $exception, created: false);
        }

        return new CaptureResult($stash, created: true);
    }

    private function existing(User $user, StashDraft $draft): ?Stash
    {
        if ($draft->urlHash === null) {
            return null;
        }

        return Stash::query()->where('user_id', $user->id)->where('url_hash', $draft->urlHash)->first();
    }

    private function create(User $user, CapturePayload $payload, StashDraft $draft): Stash
    {
        $stash = new Stash([
            'type' => $draft->type,
            'title' => $payload->title,
            'body' => $draft->body,
            'url' => $draft->url,
            'url_hash' => $draft->urlHash,
            'domain' => $draft->domain,
            'is_private' => $payload->private,
            'content_hash' => ContentHash::of(
                $draft->type,
                $draft->url,
                $draft->body,
                $draft->fileBytes === null ? null : hash(algo: 'sha256', data: $draft->fileBytes),
            ),
        ]);
        $stash->user_id = $user->id;
        $stash->ai_status = AiStatus::Skipped;
        $stash->save();

        if ($draft->fileBytes !== null && $draft->fileMime !== null) {
            $this->storage->store($stash, FileRole::Original, new Blob($draft->fileBytes, $draft->fileMime));
        }

        foreach ($payload->tags as $name) {
            $this->tags->addByUser($stash, $name);
        }

        $this->collections->add($stash, $payload->collectionIds);
        $this->pipeline->start($stash);

        return $stash;
    }
}
