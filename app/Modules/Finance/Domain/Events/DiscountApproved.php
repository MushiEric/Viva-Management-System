<?php

namespace App\Modules\Finance\Domain\Events;

use App\Modules\Finance\Infrastructure\Models\DiscountRequest;
use App\Shared\Domain\DomainEvent;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class DiscountApproved implements DomainEvent
{
    use Dispatchable, SerializesModels;

    public function __construct(public DiscountRequest $discount)
    {
    }
}
