<?php

namespace App\Modules\Finance\Application;

use App\Modules\Finance\Infrastructure\Models\Invoice;
use App\Modules\Settings\Infrastructure\Models\SystemSetting;
use Dompdf\Dompdf;
use Dompdf\Options;
use NumberFormatter;

final class InvoicePdfService
{
    public function render(Invoice $invoice): string
    {
        $invoice->loadMissing(['trainee', 'items', 'creator']);
        $settings = SystemSetting::current();
        $logoPath = base_path('frontend/public/viva_logo.jpeg');
        $logoDataUri = is_file($logoPath)
            ? 'data:image/jpeg;base64,'.base64_encode((string) file_get_contents($logoPath))
            : null;

        $html = view('invoices.tax-invoice', [
            'invoice' => $invoice,
            'settings' => $settings,
            'logoDataUri' => $logoDataUri,
            'amountInWords' => $this->amountInWords((float) $invoice->total),
        ])->render();

        $options = new Options;
        $options->set('isRemoteEnabled', false);
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return $dompdf->output();
    }

    private function amountInWords(float $amount): string
    {
        if (class_exists(NumberFormatter::class)) {
            $formatter = new NumberFormatter('en', NumberFormatter::SPELLOUT);

            return ucfirst((string) $formatter->format((int) round($amount))).' Tanzanian shillings only';
        }

        return number_format($amount, 2).' Tanzanian shillings only';
    }
}
