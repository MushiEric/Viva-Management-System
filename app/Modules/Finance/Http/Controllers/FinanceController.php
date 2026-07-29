<?php

namespace App\Modules\Finance\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use App\Modules\Finance\Application\InvoicePdfService;
use App\Modules\Finance\Application\InvoiceService;
use App\Modules\Finance\Application\PaymentService;
use App\Modules\Finance\Application\ReceiptPdfService;
use App\Modules\Finance\Infrastructure\Models\DiscountRequest;
use App\Modules\Finance\Infrastructure\Models\Invoice;
use App\Modules\Finance\Infrastructure\Models\Payment;
use App\Modules\Settings\Infrastructure\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

final class FinanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Invoice::query()
            ->whereIn('status', ['issued', 'partially_paid'])
            ->whereDate('due_date', '<', today())
            ->update(['status' => 'overdue']);

        $invoices = Invoice::with(['trainee:id,trainee_number,full_name', 'items', 'discountRequests'])
            ->latest()
            ->get();
        $payments = Payment::with(['trainee:id,trainee_number,full_name', 'allocations'])
            ->latest('paid_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'invoices' => $invoices,
                'payments' => $payments,
                'summary' => [
                    'invoiced' => (float) Invoice::whereNot('status', 'cancelled')->sum('total'),
                    'paid' => (float) Invoice::whereNot('status', 'cancelled')->sum('amount_paid'),
                    'outstanding' => (float) Invoice::whereNot('status', 'cancelled')
                        ->selectRaw('COALESCE(SUM(total - amount_paid), 0) as balance')
                        ->value('balance'),
                ],
            ],
        ]);
    }

    public function createInvoice(Request $request, InvoiceService $service): JsonResponse
    {
        $validated = $request->validate([
            'trainee_id' => ['required', 'exists:trainees,id'],
            'due_date' => ['nullable', 'date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.enrollment_id' => ['required', 'integer', 'distinct', 'exists:enrollments,id'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.amount' => ['required', 'numeric', 'min:0.01'],
        ]);
        $trainee = Trainee::findOrFail($validated['trainee_id']);

        return response()->json([
            'success' => true,
            'data' => $service->create($trainee, $validated['items'], $validated['due_date'] ?? null, $request->user()),
        ], 201);
    }

    public function showInvoice(Invoice $invoice): JsonResponse
    {
        $invoice->load([
            'trainee',
            'items',
            'creator:id,name,email',
            'allocations.payment:id,receipt_number,status,paid_at',
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'invoice' => $invoice,
                'balance_due' => max(0, (float) $invoice->total - (float) $invoice->amount_paid),
                'settings' => SystemSetting::current(),
            ],
        ]);
    }

    public function issueInvoice(Request $request, Invoice $invoice, InvoiceService $service): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $service->issue($invoice, $request->user())]);
    }

    public function downloadInvoice(Invoice $invoice, InvoicePdfService $pdf): Response
    {
        abort_if(in_array($invoice->status, ['draft', 'cancelled'], true), 422, 'Only issued invoices can be printed.');

        return response($pdf->render($invoice), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$invoice->invoice_number}.pdf\"",
        ]);
    }

    public function downloadReceipt(Payment $payment, ReceiptPdfService $pdf): Response
    {
        return response($pdf->render($payment), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$payment->receipt_number}.pdf\"",
        ]);
    }

    public function requestDiscount(Request $request, Invoice $invoice, InvoiceService $service): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        return response()->json([
            'success' => true,
            'data' => $service->requestDiscount($invoice, (float) $validated['amount'], $validated['reason'], $request->user()),
        ], 201);
    }

    public function approveDiscount(Request $request, DiscountRequest $discount, InvoiceService $service): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $service->approveDiscount($discount, $request->user())]);
    }

    public function recordPayment(Request $request, PaymentService $service): JsonResponse
    {
        $validated = $request->validate([
            'trainee_id' => ['required', 'exists:trainees,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['required', Rule::in(['cash', 'mobile_money'])],
            'provider' => ['nullable', 'string', 'max:100'],
            'reference_number' => ['nullable', 'string', 'max:255'],
            'allocations' => ['required', 'array', 'min:1'],
            'allocations.*.invoice_id' => ['required', 'integer', 'distinct', 'exists:invoices,id'],
            'allocations.*.amount' => ['required', 'numeric', 'min:0.01'],
        ]);
        $allocations = collect($validated['allocations'])->mapWithKeys(
            fn (array $allocation) => [$allocation['invoice_id'] => $allocation['amount']],
        )->all();

        return response()->json([
            'success' => true,
            'data' => $service->record(
                Trainee::findOrFail($validated['trainee_id']),
                (float) $validated['amount'],
                $validated['method'],
                $allocations,
                $request->user(),
                $validated['provider'] ?? null,
                $validated['reference_number'] ?? null,
            ),
        ], 201);
    }

    public function cancelPayment(Request $request, Payment $payment, PaymentService $service): JsonResponse
    {
        $validated = $request->validate(['reason' => ['required', 'string', 'max:2000']]);

        return response()->json(['success' => true, 'data' => $service->cancel($payment, $request->user(), $validated['reason'])]);
    }

    public function cancelInvoice(Request $request, Invoice $invoice, InvoiceService $service): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $service->cancel($invoice, $request->user())]);
    }
}
