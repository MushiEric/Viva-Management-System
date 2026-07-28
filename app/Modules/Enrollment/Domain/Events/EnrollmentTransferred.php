<?php

namespace App\Modules\Enrollment\Domain\Events;

use App\Models\Enrollment;
use App\Shared\Domain\DomainEvent;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class EnrollmentTransferred implements DomainEvent
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Enrollment $original,
        public Enrollment $replacement,
    ) {
    }
}
