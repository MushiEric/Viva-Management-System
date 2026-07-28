<?php

namespace App\Modules\Certification\Application;

use App\Models\Enrollment;
use App\Models\User;
use App\Modules\Audit\Application\AuditLogger;
use App\Modules\Certification\Domain\Events\CertificateIssued;
use App\Modules\Certification\Infrastructure\Models\Certificate;
use App\Shared\Application\EventBus;
use App\Shared\Application\SequentialNumberGenerator;
use Dompdf\Dompdf;
use Dompdf\Options;
use DomainException;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Support\Facades\Storage;

final readonly class CertificateService
{
    public function __construct(
        private SequentialNumberGenerator $numbers,
        private AuditLogger $audit,
        private EventBus $events,
    ) {
    }

    public function issue(Enrollment $enrollment, ?User $actor = null): Certificate
    {
        if ($enrollment->status !== 'completed' || !$enrollment->completed_at) {
            throw new DomainException('Certificates can only be issued for completed enrollments.');
        }

        $existing = Certificate::where('enrollment_id', $enrollment->id)->first();
        if ($existing) {
            return $existing;
        }

        $enrollment->loadMissing('trainee', 'cohort.programLevel.program', 'cohort.course.parent');
        $number = $this->numbers->next('certificate', 'VDC-CERT');
        $payload = "VDC-CERTIFICATE|{$number}|".str()->uuid();
        $qrCode = new QrCode(
            data: $payload,
            encoding: new Encoding('UTF-8'),
            errorCorrectionLevel: ErrorCorrectionLevel::High,
            size: 260,
            margin: 10,
            roundBlockSizeMode: RoundBlockSizeMode::Margin,
        );
        $qrDataUri = (new PngWriter())->write($qrCode)->getDataUri();

        $programName = $enrollment->cohort->programLevel?->program?->name
            ?? $enrollment->cohort->course?->parent?->name
            ?? $enrollment->cohort->course?->name;
        $levelName = $enrollment->cohort->programLevel?->name
            ?? $enrollment->cohort->course?->name;

        $html = view('certificates.completion', [
            'certificateNumber' => $number,
            'traineeName' => $enrollment->trainee->full_name,
            'programName' => $programName,
            'levelName' => $levelName,
            'completedAt' => $enrollment->completed_at,
            'qrDataUri' => $qrDataUri,
        ])->render();

        $options = new Options();
        $options->set('isRemoteEnabled', false);
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'landscape');
        $dompdf->render();

        $path = "certificates/{$number}.pdf";
        Storage::disk('local')->put($path, $dompdf->output());

        $certificate = Certificate::create([
            'certificate_number' => $number,
            'enrollment_id' => $enrollment->id,
            'qr_payload' => $payload,
            'file_path' => $path,
            'issued_by' => $actor?->id,
            'issued_at' => now(),
            'status' => 'issued',
        ]);
        $this->audit->record($actor, 'certificate.issued', $certificate, null, $certificate->toArray());
        $this->events->dispatch(new CertificateIssued($certificate));

        return $certificate;
    }
}
