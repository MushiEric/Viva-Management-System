<?php

namespace App\Modules\Communication\Listeners;

use App\Modules\Finance\Domain\Events\PaymentRecorded;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;

final class SendPaymentConfirmation implements ShouldQueueAfterCommit
{
    use InteractsWithQueue;

    public function handle(PaymentRecorded $event): void
    {
        $trainee = $event->payment->trainee;

        if (!$trainee?->email) {
            return;
        }

        Mail::raw(
            "Payment {$event->payment->receipt_number} for TZS {$event->payment->amount} has been recorded.",
            fn ($message) => $message
                ->to($trainee->email)
                ->subject('VIVA DIGITAL CENTER Payment Receipt'),
        );
    }
}
