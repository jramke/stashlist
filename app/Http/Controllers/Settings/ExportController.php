<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Data\ExportData;
use App\Data\ToastData;
use App\Enums\ExportStatus;
use App\Http\Controllers\Controller;
use App\Jobs\BuildExport;
use App\Models\Export;
use App\Models\User;
use App\Storage\ExportStorage;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Lang;
use Inertia\Inertia;
use Inertia\Response;

final class ExportController extends Controller
{
    /**
     * The exports of the account, newest first, and the button for a new one.
     */
    public function index(): Response
    {
        return Inertia::render('settings/export', [
            'exports' => array_values(
                Export::query()
                    ->latest('id')
                    ->limit(10)
                    ->get()
                    ->map(ExportData::fromModel(...))
                    ->all(),
            ),
        ]);
    }

    /**
     * Starts an export. One at a time: another is refused while one is waiting or being built.
     */
    public function store(#[CurrentUser] User $user): RedirectResponse
    {
        $busy = Export::query()
            ->where('user_id', $user->id)
            ->whereIn('status', [ExportStatus::Queued->value, ExportStatus::Running->value])
            ->exists();

        if ($busy) {
            ToastData::info(Lang::string('An export is already being made.'))->flash();

            return back();
        }

        $export = new Export;
        $export->user_id = $user->id;
        $export->save();

        dispatch(new BuildExport($export->id, $user->id));

        ToastData::success(Lang::string('Making your export. It appears here when it is ready.'))->flash();

        return back();
    }

    /**
     * Sends the person to a temporary address of the zip. It is private: only its owner is let through, and the
     * address works for ten minutes.
     */
    public function download(Export $export, ExportStorage $storage): RedirectResponse
    {
        Gate::authorize('view', $export);
        $path = $export->path;

        if ($path === null || ! $export->isDownloadable()) {
            abort(410);
        }

        return redirect()->away($storage->downloadUrl(
            $path,
            'stashlist-export-'.($export->created_at?->format('Y-m-d') ?? 'data').'.zip',
            now()->addMinutes(10),
        ));
    }
}
