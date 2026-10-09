<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Models\Scopes\UserScope;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * For every model whose rows belong to one user: adds the ownership scope and fills user_id on create.
 *
 * @require-extends Model
 */
trait BelongsToUser
{
    public static function bootBelongsToUser(): void
    {
        static::addGlobalScope(new UserScope);

        static::creating(static function (Model $model): void {
            $model->setAttribute('user_id', $model->getAttribute('user_id') ?? Auth::id());
        });
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
