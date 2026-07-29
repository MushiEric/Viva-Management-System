<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $payment->receipt_number }}</title>
    <style>
        @page { margin: 24px; }
        body { font-family: DejaVu Sans, sans-serif; color: #111827; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #cbd5e1; padding: 7px; vertical-align: top; }
        .no-border td { border: 0; }
        .heading { color: #0f4f7a; font-size: 22px; font-weight: bold; text-align: right; }
        .company { line-height: 1.5; }
        .section { margin-top: 16px; }
        .label { width: 34%; font-weight: bold; background: #f8fafc; }
        .right { text-align: right; }
        .total { font-size: 14px; font-weight: bold; color: #0f4f7a; }
        .cancelled { margin-top: 12px; border: 2px solid #dc2626; padding: 8px; color: #dc2626; text-align: center; font-weight: bold; }
        .footer { margin-top: 18px; text-align: center; color: #64748b; }
    </style>
</head>
<body>
    <table class="no-border">
        <tr>
            <td style="width: 45%;">
                @if($logoDataUri)
                    <img src="{{ $logoDataUri }}" style="width: 170px; max-height: 85px; object-fit: contain;">
                @else
                    <strong>{{ $settings->brand_name }}</strong>
                @endif
            </td>
            <td>
                <div class="heading">PAYMENT RECEIPT</div>
                <div class="company" style="text-align: right;">
                    <strong>{{ $settings->brand_name }}</strong><br>
                    TIN: {{ $settings->tin }}<br>
                    {{ $settings->phone }} · {{ $settings->email }}
                </div>
            </td>
        </tr>
    </table>

    @if($payment->status === 'cancelled')
        <div class="cancelled">CANCELLED — {{ $payment->cancellation_reason }}</div>
    @endif

    <table class="section">
        <tr><td class="label">Receipt Number</td><td>{{ $payment->receipt_number }}</td></tr>
        <tr><td class="label">Payment Date</td><td>{{ $payment->paid_at->format('d/m/Y H:i') }}</td></tr>
        <tr><td class="label">Received From</td><td>{{ $payment->trainee->full_name }}</td></tr>
        <tr><td class="label">Phone / Email</td><td>{{ $payment->trainee->phone }}{{ $payment->trainee->email ? ' / '.$payment->trainee->email : '' }}</td></tr>
        <tr><td class="label">Payment Method</td><td>{{ str($payment->method)->replace('_', ' ')->title() }}{{ $payment->provider ? ' — '.$payment->provider : '' }}</td></tr>
        <tr><td class="label">Transaction Reference</td><td>{{ $payment->reference_number ?: '—' }}</td></tr>
    </table>

    <table class="section">
        <thead>
            <tr><th>Invoice</th><th class="right">Amount (TZS)</th></tr>
        </thead>
        <tbody>
            @foreach($payment->allocations as $allocation)
                <tr>
                    <td>{{ $allocation->invoice->invoice_number }}</td>
                    <td class="right">{{ number_format((float) $allocation->amount, 2) }}</td>
                </tr>
            @endforeach
            <tr>
                <td class="total">Total Received</td>
                <td class="right total">{{ number_format((float) $payment->amount, 2) }} TZS</td>
            </tr>
        </tbody>
    </table>

    <p><strong>Amount in words:</strong> {{ $amountInWords }}</p>
    <table class="section">
        <tr><th>Received By</th><th>Customer Signature</th></tr>
        <tr><td style="height: 44px;">{{ $payment->recorder?->name }}</td><td></td></tr>
    </table>
    <div class="footer">{{ $settings->location }} · {{ $settings->website }}</div>
</body>
</html>
