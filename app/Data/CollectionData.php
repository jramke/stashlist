<?php

declare(strict_types=1);

namespace App\Data;

use App\Models\Collection;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final readonly class CollectionData
{
    public function __construct(
        public int $id,
        public string $name,
        public ?string $description,
        public int $position,
    ) {}

    public static function fromModel(Collection $collection): self
    {
        return new self(
            id: $collection->id,
            name: $collection->name,
            description: $collection->description,
            position: $collection->position,
        );
    }
}
