<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $invoice->invoice_number }}</title>
    <style>
        @page { margin: 28px 38px; }
        body { font-family: DejaVu Sans, sans-serif; color: #111827; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #111827; padding: 7px; vertical-align: top; }
        .no-border td { border: 0; }
        .brand { color: #0f4f7a; font-size: 30px; font-weight: bold; letter-spacing: 1px; }
        .heading { color: #0f4f7a; font-size: 28px; font-weight: bold; text-align: center; }
        .company { font-size: 12px; line-height: 1.55; }
        .label { font-weight: bold; width: 22%; }
        .section { margin-top: 22px; }
        .right { text-align: right; }
        .center { text-align: center; }
        .payment-title { color: #31962c; font-size: 18px; font-weight: bold; }
        .signature { height: 65px; }
        .footer { color: #0f4f7a; text-align: center; font-size: 15px; font-weight: bold; margin-top: 8px; }
    </style>
</head>
<body>
    <table class="no-border">
        <tr>
            <td style="width: 45%;">
                @if($logoDataUri)
                    <img src="{{ $logoDataUri }}" style="width: 240px; max-height: 130px; object-fit: contain;">
                @else
                    <div class="brand">{{ $settings->brand_name }}</div>
                @endif
            </td>
            <td>
                <div class="heading">TAX INVOICE</div>
                <div class="company">
                    <strong>{{ $settings->brand_name }}</strong><br>
                    {{ $settings->location }}<br>
                    Phone: {{ $settings->phone }}<br>
                    Email: {{ $settings->email }}<br>
                    Website: {{ $settings->website }}<br>
                    TIN: {{ $settings->tin }}
                </div>
            </td>
        </tr>
    </table>

    <table class="section">
        <tr><td class="label">Invoice No.</td><td>{{ $invoice->invoice_number }}</td><td class="label">Bill To</td><td>{{ $invoice->trainee->full_name }}</td></tr>
        <tr><td class="label">Invoice Date</td><td>{{ optional($invoice->issued_at)->format('d/m/Y') ?: $invoice->created_at->format('d/m/Y') }}</td><td class="label">Customer TIN</td><td>{{ $invoice->trainee->tin ?: '—' }}</td></tr>
        <tr><td class="label">Due Date</td><td>{{ optional($invoice->due_date)->format('d/m/Y') ?: '—' }}</td><td class="label">Address</td><td>{{ $invoice->trainee->address }}</td></tr>
        <tr><td class="label">Reference</td><td>{{ $invoice->invoice_number }}</td><td class="label">Phone/Email</td><td>{{ $invoice->trainee->phone }}{{ $invoice->trainee->email ? ' / '.$invoice->trainee->email : '' }}</td></tr>
    </table>

    <table class="section">
        <thead>
            <tr><th style="width: 7%;">Item</th><th>Description</th><th style="width: 9%;">Qty</th><th style="width: 19%;">Unit Price (TZS)</th><th style="width: 19%;">Amount (TZS)</th></tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $index => $item)
                <tr>
                    <td class="center">{{ $index + 1 }}</td>
                    <td>{{ $item->description }}</td>
                    <td class="center">1</td>
                    <td class="right">{{ number_format((float) $item->amount, 2) }}</td>
                    <td class="right">{{ number_format((float) $item->amount, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="section">
        <tr><td class="label">Subtotal</td><td class="right">{{ number_format((float) $invoice->subtotal, 2) }} TZS</td></tr>
        <tr><td class="label">Discount</td><td class="right">{{ number_format((float) $invoice->discount_amount, 2) }} TZS</td></tr>
        <tr><td class="label">Grand Total</td><td class="right"><strong>{{ number_format((float) $invoice->total, 2) }} TZS</strong></td></tr>
        <tr><td class="label">Amount in Words</td><td>{{ $amountInWords }}</td></tr>
    </table>

    <div class="section payment-title">Payment Details</div>
    <div style="line-height: 1.7; margin-top: 8px;">
        Bank Name: {{ $settings->bank_name ?: '________________________' }}<br>
        Account Name: {{ $settings->account_name ?: $settings->brand_name }}<br>
        Account Number: {{ $settings->account_number ?: '________________________' }}<br>
        Mobile Money: {{ $settings->mobile_money ?: '________________________' }}
    </div>

    <table class="section">
        <tr><th>Prepared By</th><th>Authorized Signatory</th></tr>
        <tr class="signature"><td>{{ $invoice->creator?->name }}</td><td></td></tr>
    </table>
    <div class="footer">Thank you for doing business with us!</div>
</body>
</html>
