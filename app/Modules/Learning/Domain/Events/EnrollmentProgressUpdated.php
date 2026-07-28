<?php

namespace App\Modules\Learning\Domain\Events;

use App\Models\Enrollment;
use App\Shared\Domain\DomainEvent;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class EnrollmentProgressUpdated implements DomainEvent
{
    use Dispatchable, SerializesModels;

    public function __construct(public Enrollment $enrollment)
    {
    }
}
