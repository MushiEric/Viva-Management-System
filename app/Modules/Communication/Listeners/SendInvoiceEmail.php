<?php

namespace App\Modules\Communication\Listeners;

use App\Modules\Communication\Notifications\PortalNotification;
use App\Modules\Finance\Domain\Events\InvoiceIssued;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;

final class SendInvoiceEmail implements ShouldQueueAfterCommit
{
    use InteractsWithQueue;

    public function handle(InvoiceIssued $event): void
    {
        $invoice = $event->invoice->loadMissing('trainee', 'creator');

        $invoice->creator?->notify(new PortalNotification(
            'finance',
            'Invoice Issued',
            "Invoice {$invoice->invoice_number} was issued for TZS {$invoice->total}.",
            '/finance',
            ['invoice_id' => $invoice->id],
        ));

        if (! $invoice->trainee->email) {
            return;
        }

        Mail::raw(
            "Invoice {$invoice->invoice_number} has been issued for TZS {$invoice->total}.",
            fn ($message) => $message
                ->to($invoice->trainee->email)
                ->subject('VIVA DIGITAL CENTER Invoice'),
        );
    }
}
