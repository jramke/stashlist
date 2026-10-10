<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * A code that lets one person register while registration is by invitation. Not user-owned: it exists before the
 * user does.
 *
 * @property int $id
 * @property string $code
 * @property string|null $email
 * @property int|null $used_by
 * @property CarbonImmutable|null $used_at
 * @property CarbonImmutable|null $expires_at
 */
#[Fillable(['code', 'email', 'expires_at'])]
final class Invitation extends Model
{
    /**
     * @return array<string, string>
     */
    #[\Override]
    protected function casts(): array
    {
        return ['used_at' => 'datetime', 'expires_at' => 'datetime'];
    }

    public function isUsable(): bool
    {
        return $this->used_at === null && ($this->expires_at === null || $this->expires_at->isFuture());
    }
}
