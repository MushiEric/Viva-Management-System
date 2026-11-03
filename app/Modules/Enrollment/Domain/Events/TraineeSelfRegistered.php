<?php

namespace App\Modules\Enrollment\Domain\Events;

use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use App\Shared\Domain\DomainEvent;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class TraineeSelfRegistered implements DomainEvent
{
    use Dispatchable, SerializesModels;

    public function __construct(public Trainee $trainee) {}
}
