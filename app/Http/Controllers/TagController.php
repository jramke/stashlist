<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Data\PagingData;
use App\Data\TagData;
use App\Data\ToastData;
use App\Http\Requests\IndexTagRequest;
use App\Http\Requests\MergeTagRequest;
use App\Http\Requests\UpdateTagRequest;
use App\Models\Tag;
use App\Tags\TagMerge;
use App\Tags\TagNameTaken;
use App\Tags\TagSync;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Lang;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class TagController extends Controller
{
    private const PER_PAGE = 50;

    /**
     * The user's tags, the most used first, a page at a time, narrowed by the words of `q` in their names. `options`
     * (every tag, for the merge picker) is only sent when the page asks for it.
     */
    public function index(IndexTagRequest $request): Response|RedirectResponse
    {
        $search = $request->search();

        $tags = Tag::query()
            ->when($search !== null, static fn (Builder $query) => $query->where(
                'name',
                'like',
                '%'.addcslashes((string)$search, '\\%_').'%',
            ))
            ->orderByDesc('stashes_count')
            ->orderBy('name')
            ->paginate(self::PER_PAGE);

        // A page that is gone (the last tag of the last page was deleted): the new last one.
        if ($tags->total() > 0 && $tags->currentPage() > $tags->lastPage()) {
            return redirect()->route('tags.index', array_filter(
                ['q' => $search, 'page' => $tags->lastPage()],
                static fn (mixed $value): bool => $value !== null,
            ));
        }

        return Inertia::render('tags/index', [
            'tags' => array_values($tags->getCollection()->map(TagData::fromModel(...))->all()),
            'paging' => PagingData::of($tags),
            'q' => $search,
            'options' => Inertia::optional(static fn (): array => array_values(
                Tag::query()
                    ->orderBy('name')
                    ->get()
                    ->map(TagData::fromModel(...))
                    ->all(),
            )),
        ]);
    }

    public function update(UpdateTagRequest $request, Tag $tag, TagSync $tags): RedirectResponse
    {
        Gate::authorize('update', $tag);

        try {
            $tags->rename($tag, $request->name());
        } catch (TagNameTaken $taken) {
            throw ValidationException::withMessages(['name' => $taken->getMessage()]);
        }

        ToastData::success(Lang::string('Saved.'))->flash();

        return back();
    }

    /**
     * Folds this tag into another of the user's: its stashes get the other, and this one is gone.
     */
    public function merge(MergeTagRequest $request, Tag $tag, TagMerge $merge): RedirectResponse
    {
        $into = Tag::query()->findOrFail($request->target());

        Gate::authorize('update', $tag);
        Gate::authorize('update', $into);

        $merge->merge($tag, $into);

        ToastData::success(Lang::string('Merged :from into :into.', [
            'from' => $tag->name,
            'into' => $into->name,
        ]))->flash();

        return back();
    }

    public function destroy(Tag $tag, TagSync $tags): RedirectResponse
    {
        Gate::authorize('delete', $tag);

        $tags->delete($tag);

        ToastData::success(Lang::string('Tag deleted.'))->flash();

        return back();
    }
}
