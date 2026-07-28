<?php

namespace App\Modules\Certification\Listeners;

use App\Modules\Certification\Infrastructure\Models\Certificate;
use App\Modules\Learning\Domain\Events\EnrollmentCompleted;
use App\Shared\Application\SequentialNumberGenerator;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

final class IssueCertificateOnCompletion implements ShouldQueue
{
    use InteractsWithQueue;

    public function __construct(private SequentialNumberGenerator $numbers)
    {
    }

    public function handle(EnrollmentCompleted $event): void
    {
        Certificate::firstOrCreate(
            ['enrollment_id' => $event->enrollment->id],
            [
                'certificate_number' => $this->numbers->next('certificate', 'VDC-CERT'),
                'qr_payload' => (string) str()->uuid(),
                'issued_by' => auth()->id(),
                'issued_at' => now(),
                'status' => 'issued',
            ],
        );
    }
}
