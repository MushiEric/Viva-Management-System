<?php

namespace App\Modules\Training\Domain\Events;

use App\Modules\Training\Infrastructure\Models\ProgramLevel;
use App\Shared\Domain\DomainEvent;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class ProgramFeeApproved implements DomainEvent
{
    use Dispatchable, SerializesModels;

    public function __construct(public ProgramLevel $level)
    {
    }
}
