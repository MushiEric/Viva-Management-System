<?php

namespace App\Modules\Finance\Application;

use App\Models\Enrollment;
use App\Models\User;
use App\Modules\Audit\Application\AuditLogger;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use App\Modules\Finance\Domain\Events\DiscountApproved;
use App\Modules\Finance\Domain\Events\InvoiceIssued;
use App\Modules\Finance\Infrastructure\Models\DiscountRequest;
use App\Modules\Finance\Infrastructure\Models\Invoice;
use App\Shared\Application\EventBus;
use App\Shared\Application\SequentialNumberGenerator;
use DomainException;
use Illuminate\Support\Facades\DB;

final readonly class InvoiceService
{
    public function __construct(
        private SequentialNumberGenerator $numbers,
        private EventBus $events,
        private AuditLogger $audit,
    ) {
    }

    public function create(Trainee $trainee, array $items, ?string $dueDate, User $actor): Invoice
    {
        return DB::transaction(function () use ($trainee, $items, $dueDate, $actor) {
            $subtotal = 0.0;

            foreach ($items as $item) {
                $belongsToTrainee = Enrollment::query()
                    ->whereKey($item['enrollment_id'])
                    ->where('trainee_id', $trainee->id)
                    ->exists();

                if (!$belongsToTrainee) {
                    throw new DomainException('Every invoice item must belong to the selected trainee.');
                }
                $subtotal += (float) $item['amount'];
            }

            $invoice = Invoice::create([
                'invoice_number' => $this->numbers->next('invoice', 'INV'),
                'trainee_id' => $trainee->id,
                'status' => 'draft',
                'currency' => 'TZS',
                'subtotal' => $subtotal,
                'discount_amount' => 0,
                'total' => $subtotal,
                'amount_paid' => 0,
                'due_date' => $dueDate,
                'created_by' => $actor->id,
            ]);
            $invoice->items()->createMany($items);
            $this->audit->record($actor, 'invoice.created', $invoice, null, $invoice->load('items')->toArray());

            return $invoice->load('items', 'trainee');
        });
    }

    public function issue(Invoice $invoice, User $actor): Invoice
    {
        if ($invoice->status !== 'draft') {
            throw new DomainException('Only a draft invoice can be issued.');
        }

        $before = $invoice->toArray();
        $invoice->update(['status' => 'issued', 'issued_at' => now()]);
        $this->audit->record($actor, 'invoice.issued', $invoice, $before, $invoice->fresh()->toArray());
        $this->events->dispatch(new InvoiceIssued($invoice));

        return $invoice;
    }

    public function requestDiscount(Invoice $invoice, float $amount, string $reason, User $actor): DiscountRequest
    {
        if (in_array($invoice->status, ['paid', 'cancelled'], true)) {
            throw new DomainException('A discount cannot be requested for a paid or cancelled invoice.');
        }
        if ($amount <= 0 || $amount >= (float) $invoice->subtotal) {
            throw new DomainException('Discount must be greater than zero and less than the invoice subtotal.');
        }
        if ($invoice->discountRequests()->where('status', 'pending')->exists()) {
            throw new DomainException('This invoice already has a pending discount request.');
        }

        $discount = $invoice->discountRequests()->create([
            'amount' => $amount,
            'reason' => $reason,
            'status' => 'pending',
            'requested_by' => $actor->id,
        ]);
        $this->audit->record($actor, 'discount.requested', $discount, null, $discount->toArray());

        return $discount;
    }

    public function approveDiscount(DiscountRequest $discount, User $manager): DiscountRequest
    {
        return DB::transaction(function () use ($discount, $manager) {
            if ($discount->status !== 'pending') {
                throw new DomainException('Only a pending discount can be approved.');
            }

            $invoice = Invoice::lockForUpdate()->findOrFail($discount->invoice_id);
            $newTotal = (float) $invoice->subtotal - (float) $discount->amount;
            if ($newTotal < (float) $invoice->amount_paid) {
                throw new DomainException('Discount cannot reduce the invoice below the amount already paid.');
            }

            $discount->update([
                'status' => 'approved',
                'approved_by' => $manager->id,
                'approved_at' => now(),
            ]);
            $invoice->update([
                'discount_amount' => $discount->amount,
                'total' => $newTotal,
                'status' => (float) $invoice->amount_paid === $newTotal ? 'paid' : $invoice->status,
            ]);
            $this->audit->record($manager, 'discount.approved', $discount, null, $discount->fresh()->toArray());
            $this->events->dispatch(new DiscountApproved($discount));

            return $discount->load('invoice');
        });
    }

    public function cancel(Invoice $invoice, User $actor): Invoice
    {
        if ((float) $invoice->amount_paid > 0) {
            throw new DomainException('An invoice with payments cannot be cancelled.');
        }
        if ($invoice->status === 'cancelled') {
            throw new DomainException('Invoice is already cancelled.');
        }

        $before = $invoice->toArray();
        $invoice->update(['status' => 'cancelled']);
        $this->audit->record($actor, 'invoice.cancelled', $invoice, $before, $invoice->fresh()->toArray());

        return $invoice;
    }
}
