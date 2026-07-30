<?php

namespace App\Modules\Communication\Listeners;

use App\Modules\Communication\Notifications\PortalNotification;
use App\Modules\Finance\Domain\Events\DiscountApproved;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;

final class SendDiscountApprovalEmail implements ShouldQueueAfterCommit
{
    use InteractsWithQueue;

    public function handle(DiscountApproved $event): void
    {
        $discount = $event->discount->loadMissing('invoice.trainee', 'requester');
        $trainee = $discount->invoice->trainee;

        $discount->requester?->notify(new PortalNotification(
            'finance',
            'Invoice Discount Approved',
            "A discount of TZS {$discount->amount} was approved for invoice {$discount->invoice->invoice_number}.",
            '/finance',
            ['invoice_id' => $discount->invoice_id, 'discount_id' => $discount->id],
        ));

        if (! $trainee->email) {
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
