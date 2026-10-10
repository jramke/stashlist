<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Ai\Bakeoff\Bakeoff as Runner;
use App\Ai\Bakeoff\Report;
use App\Ai\Llm;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

#[Signature('stashlist:bakeoff
    {--user= : Id of the user whose stashes are used}
    {--count=50 : How many stashes}
    {--models=openai:gpt-5-nano,openai:gpt-5-mini,openai:gpt-5.4-mini : Comma separated provider:model pairs}
    {--seed= : Seed for the sample, to repeat a run on the same stashes}
    {--yes : Do not ask before sending the stashes to the providers}')]
#[Description('Run a sample of stashes through several models and write a side-by-side report')]
final class Bakeoff extends Command
{
    public function handle(Runner $bakeoff, Report $report): int
    {
        $user = User::query()->find($this->option('user'));

        if (! $user instanceof User) {
            $this->components->error('Pass the id of an existing user with --user.');

            return self::FAILURE;
        }

        try {
            $models = array_values(array_map(Llm::parse(...), array_filter(explode(',', $this->text('models') ?? ''))));
        } catch (InvalidArgumentException $failure) {
            $this->components->error($failure->getMessage());

            return self::FAILURE;
        }

        $seed = $this->text('seed');
        $stashes = $bakeoff->sample($user->id, (int)$this->text('count'), $seed === null ? null : (int)$seed);

        if ($stashes->isEmpty() || $models === []) {
            $this->components->error('There are no stashes with text, or no models, to run.');

            return self::FAILURE;
        }

        $this->components->info(sprintf(
            '%d stashes of %s, %d models.',
            $stashes->count(),
            $user->name,
            count($models),
        ));

        // The text of the stashes leaves for the providers: the person running this should know.
        if (
            ! $this->option('yes') && ! $this->confirm('Send the text of these stashes to the providers named above?')
        ) {
            return self::FAILURE;
        }

        $trials = $bakeoff->run($stashes, $models);
        $path = 'bakeoff/'.now()->format('Ymd-His').'.md';

        Storage::disk('local')->put(
            $path,
            $report->markdown(
                $stashes,
                array_values(array_map(static fn (Llm $llm): string => $llm->name(), $models)),
                $trials,
            ),
        );

        $this->components->info('Report written to '.Storage::disk('local')->path($path));

        return self::SUCCESS;
    }

    private function text(string $name): ?string
    {
        $value = $this->option($name);

        return is_scalar($value) && (string)$value !== '' ? (string)$value : null;
    }
}
