<?php

namespace App\Modules\Communication\Infrastructure\Sms;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

final class BeemSmsClient
{
    public function isConfigured(): bool
    {
        return filled(config('services.beem.key'))
            && filled(config('services.beem.secret'))
            && filled(config('services.beem.sender_id'));
    }

    /**
     * Send a single SMS. Silently skipped when Beem credentials are not configured,
     * so an unconfigured environment never breaks the flow that triggered it.
     */
    public function send(string $phone, string $message): void
    {
        $destination = self::normalizePhone($phone);

        if ($destination === null) {
            Log::warning('SMS skipped: unrecognised phone number format.', ['phone' => $phone]);

            return;
        }

        if (! $this->isConfigured()) {
            Log::info('SMS skipped: Beem credentials are not configured.', ['to' => $destination]);

            return;
        }

        $response = Http::withBasicAuth(config('services.beem.key'), config('services.beem.secret'))
            ->acceptJson()
            ->timeout(15)
            ->post(config('services.beem.url'), [
                'source_addr' => config('services.beem.sender_id'),
                'schedule_time' => '',
                'encoding' => 0,
                'message' => $message,
                'recipients' => [
                    ['recipient_id' => 1, 'dest_addr' => $destination],
                ],
            ]);

        if ($response->failed()) {
            throw new RuntimeException("Beem SMS request failed with HTTP {$response->status()}: {$response->body()}");
        }
    }

    /**
     * Convert local Tanzanian formats (0712..., +255 712..., 712...) to 2557XXXXXXXX.
     */
    public static function normalizePhone(string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', $phone);

        $normalized = match (true) {
            str_starts_with($digits, '255') && strlen($digits) === 12 => $digits,
            str_starts_with($digits, '0') && strlen($digits) === 10 => '255'.substr($digits, 1),
            strlen($digits) === 9 => '255'.$digits,
            default => null,
        };

        return $normalized !== null && preg_match('/^255[67]\d{8}$/', $normalized) ? $normalized : null;
    }
}
