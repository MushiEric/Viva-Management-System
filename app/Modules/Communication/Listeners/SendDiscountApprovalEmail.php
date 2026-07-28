<?php

namespace App\Modules\Communication\Listeners;

use App\Modules\Finance\Domain\Events\DiscountApproved;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;

final class SendDiscountApprovalEmail implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(DiscountApproved $event): void
    {
        $discount = $event->discount->loadMissing('invoice.trainee');
        $trainee = $discount->invoice->trainee;

        if (!$trainee->email) {
            return;
        }

        Mail::raw(
            "A discount of TZS {$discount->amount} was approved for invoice {$discount->invoice->invoice_number}.",
            fn ($message) => $message
                ->to($trainee->email)
                ->subject('Invoice Discount Approved'),
        );
    }
}
