<?php

namespace App\Modules\Training\Domain\Events;

use App\Models\Cohort;
use App\Shared\Domain\DomainEvent;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class CohortScheduled implements DomainEvent
{
    use Dispatchable, SerializesModels;

    public function __construct(public Cohort $cohort)
    {
    }
}
