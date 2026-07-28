<?php

namespace App\Modules\Finance\Application;

use App\Models\User;
use App\Modules\Audit\Application\AuditLogger;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use App\Modules\Finance\Domain\Events\PaymentRecorded;
use App\Modules\Finance\Infrastructure\Models\Invoice;
use App\Modules\Finance\Infrastructure\Models\Payment;
use App\Shared\Application\EventBus;
use App\Shared\Application\SequentialNumberGenerator;
use DomainException;
use Illuminate\Support\Facades\DB;

final readonly class PaymentService
{
    public function __construct(
        private SequentialNumberGenerator $numbers,
        private EventBus $events,
        private AuditLogger $audit,
    ) {
    }

    /**
     * @param array<int, float|int|string> $invoiceAllocations keyed by invoice id
     */
    public function record(
        Trainee $trainee,
        float $amount,
        string $method,
        array $invoiceAllocations,
        User $actor,
        ?string $provider = null,
        ?string $reference = null,
    ): Payment {
        return DB::transaction(function () use ($trainee, $amount, $method, $invoiceAllocations, $actor, $provider, $reference) {
            $allocated = array_sum(array_map('floatval', $invoiceAllocations));
            if (round($allocated, 2) !== round($amount, 2)) {
                throw new DomainException('Payment allocations must equal the payment amount.');
            }

            $payment = Payment::create([
                'receipt_number' => $this->numbers->next('receipt', 'RCT'),
                'trainee_id' => $trainee->id,
                'amount' => $amount,
                'currency' => 'TZS',
                'method' => $method,
                'provider' => $provider,
                'reference_number' => $reference,
                'status' => 'confirmed',
                'paid_at' => now(),
                'recorded_by' => $actor->id,
            ]);

            foreach ($invoiceAllocations as $invoiceId => $allocationAmount) {
                $invoice = Invoice::lockForUpdate()->where('trainee_id', $trainee->id)->findOrFail($invoiceId);
                $payment->allocations()->create(['invoice_id' => $invoice->id, 'amount' => $allocationAmount]);
                $paid = (float) $invoice->amount_paid + (float) $allocationAmount;
                $invoice->update([
                    'amount_paid' => $paid,
                    'status' => $paid >= (float) $invoice->total ? 'paid' : 'partially_paid',
                ]);
            }

            $this->audit->record($actor, 'payment.recorded', $payment, null, $payment->toArray());
            $this->events->dispatch(new PaymentRecorded($payment));

            return $payment;
        });
    }

    public function cancel(Payment $payment, User $actor, string $reason): Payment
    {
        return DB::transaction(function () use ($payment, $actor, $reason) {
            if ($payment->status === 'cancelled') {
                throw new DomainException('Payment is already cancelled.');
            }

            $before = $payment->toArray();
            foreach ($payment->allocations()->with('invoice')->get() as $allocation) {
                $invoice = Invoice::lockForUpdate()->findOrFail($allocation->invoice_id);
                $paid = max(0, (float) $invoice->amount_paid - (float) $allocation->amount);
                $invoice->update([
                    'amount_paid' => $paid,
                    'status' => $paid > 0 ? 'partially_paid' : 'issued',
                ]);
            }

            $payment->update([
                'status' => 'cancelled',
                'cancelled_by' => $actor->id,
                'cancelled_at' => now(),
                'cancellation_reason' => $reason,
            ]);
            $this->audit->record($actor, 'payment.cancelled', $payment, $before, $payment->fresh()->toArray());

            return $payment;
        });
    }
}
