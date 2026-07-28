<?php

namespace App\Modules\Identity\Domain\Events;

use App\Models\User;
use App\Shared\Domain\DomainEvent;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class StaffAccountApproved implements DomainEvent
{
    use Dispatchable, SerializesModels;

    public function __construct(public User $staff)
    {
    }
}
