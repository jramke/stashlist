<?php

declare(strict_types=1);

namespace App\Ai;

use App\Ai\Agents\StashEnricher;
use App\Enums\FileRole;
use App\Models\Stash;
use App\Models\StashFile;
use App\Pipeline\ProviderCall;
use App\Storage\StashStorage;
use Laravel\Ai\Files\Base64Image;
use Laravel\Ai\Files\Image;
use Laravel\Ai\Responses\Data\TextUsage;
use Laravel\Ai\Responses\StructuredAgentResponse;
use RuntimeException;

/**
 * Asks the model about a stash. Everything that leaves for a provider passes here, after the AiGuard.
 *
 * An answer that breaks the rules is sent back with what was wrong, twice at most; then the stash fails with
 * `llm_invalid`. No answer at all is a refusal and is not asked again.
 */
final class Enricher
{
    private const REPAIRS = 2;

    public function __construct(
        private readonly AiGuard $guard,
        private readonly TagVocabulary $vocabulary,
        private readonly StashStorage $storage,
    ) {}

    /**
     * @throws AiNotAllowed
     * @throws EnrichmentInvalid
     * @throws EnrichmentRefused
     */
    public function enrich(Stash $stash, ?Llm $llm = null): Enrichment
    {
        $this->guard->assertAllowed($stash);

        $llm ??= Llm::configured();
        $input = EnrichmentInput::of($stash);
        $agent = new StashEnricher($this->vocabulary->forUser($stash->user_id), $llm);
        $prompt = $input->prompt();
        $attachments = $input->hasPicture() ? [$this->picture($stash)] : [];
        $usage = new TextUsage;
        $invalid = new EnrichmentInvalid(['No answer was accepted.']);

        for ($attempt = 0; $attempt <= self::REPAIRS; $attempt++) {
            $response = $agent->prompt($prompt, $attachments);
            $usage = $usage->add($response->usage);

            /** @var array<string, mixed> $answer */
            $answer = $response instanceof StructuredAgentResponse ? $response->toArray() : [];

            if ($answer === []) {
                throw new EnrichmentRefused;
            }

            try {
                $result = EnrichmentResult::from($answer, $input->isShort() ? 1 : 2);
            } catch (EnrichmentInvalid $invalid) {
                $prompt =
                    $input->prompt().
                    "\n\nYour previous answer was rejected: ".
                    implode(' ', $invalid->errors).
                    "\nAnswer again and fix this.";

                continue;
            }

            return new Enrichment($result, new ProviderCall(
                provider: $llm->provider,
                model: $llm->model,
                tokensIn: $usage->inputTokens,
                tokensOut: $usage->outputTokens,
                inputHash: $input->hash($llm),
            ));
        }

        throw $invalid;
    }

    /**
     * The picture as the model sees it: the preview, already shrunk and stripped of metadata (no location), sent
     * with the request itself rather than as an address a third party would fetch.
     *
     * @throws RuntimeException when the stash has no preview
     */
    private function picture(Stash $stash): Base64Image
    {
        $preview = StashFile::query()
            ->where('stash_id', $stash->id)
            ->where('role', FileRole::Preview->value)
            ->first();

        if (! $preview instanceof StashFile) {
            throw new RuntimeException('The stash has no picture to read.');
        }

        return Image::fromBase64(base64_encode($this->storage->contents($preview)), $preview->mime);
    }
}
