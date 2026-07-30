<?php

namespace App\Modules\Communication\Listeners;

use App\Modules\Communication\Notifications\PortalNotification;
use App\Modules\Finance\Domain\Events\PaymentRecorded;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;

final class SendPaymentConfirmation implements ShouldQueueAfterCommit
{
    use InteractsWithQueue;

    public function handle(PaymentRecorded $event): void
    {
        $payment = $event->payment->loadMissing('trainee', 'recorder');
        $trainee = $payment->trainee;

        $payment->recorder?->notify(new PortalNotification(
            'finance',
            'Payment Recorded',
            "Payment {$payment->receipt_number} for TZS {$payment->amount} was recorded.",
            '/finance',
            ['payment_id' => $payment->id],
        ));

        if (! $trainee?->email) {
            return;
        }

        Mail::raw(
            "Payment {$payment->receipt_number} for TZS {$payment->amount} has been recorded.",
            fn ($message) => $message
                ->to($trainee->email)
                ->subject('VIVA DIGITAL CENTER Payment Receipt'),
        );
    }
}
