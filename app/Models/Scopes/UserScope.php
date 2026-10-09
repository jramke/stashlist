<?php

declare(strict_types=1);

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

/**
 * Limits every query to the signed-in user's rows.
 *
 * A web request without a user fails closed. Console commands and queue workers have no user and
 * stay unscoped: their jobs carry the ids they need and filter by them.
 *
 * @implements Scope<Model>
 */
final class UserScope implements Scope
{
    /**
     * @param  Builder<Model>  $builder
     */
    #[\Override]
    public function apply(Builder $builder, Model $model): void
    {
        $id = Auth::id();

        if ($id !== null) {
            $builder->where($model->qualifyColumn('user_id'), $id);

            return;
        }

        if (! app()->runningInConsole()) {
            $builder->whereRaw('1 = 0');
        }
    }
}
