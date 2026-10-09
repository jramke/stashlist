<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A GitHub or Google identity linked to a user. No ownership scope: it is read before anyone is logged in.
 *
 * @property int $id
 * @property int $user_id
 * @property string $provider github or google
 * @property string $provider_id GitHub numeric id or Google "sub", as a string
 * @property string|null $email last seen from the provider
 * @property string|null $avatar_url
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['user_id', 'provider', 'provider_id', 'email', 'avatar_url'])]
final class OAuthAccount extends Model
{
    protected $table = 'oauth_accounts';

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
