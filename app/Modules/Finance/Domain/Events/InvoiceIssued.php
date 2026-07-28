<?php

namespace App\Modules\Finance\Domain\Events;

use App\Modules\Finance\Infrastructure\Models\Invoice;
use App\Shared\Domain\DomainEvent;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class InvoiceIssued implements DomainEvent
{
    use Dispatchable, SerializesModels;

    public function __construct(public Invoice $invoice)
    {
    }
}
