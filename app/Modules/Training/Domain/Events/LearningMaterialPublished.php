<?php

namespace App\Modules\Training\Domain\Events;

use App\Modules\Training\Infrastructure\Models\LearningMaterial;
use App\Shared\Domain\DomainEvent;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class LearningMaterialPublished implements DomainEvent
{
    use Dispatchable, SerializesModels;

    public function __construct(public LearningMaterial $material)
    {
    }
}
