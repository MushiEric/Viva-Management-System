<?php

namespace App\Modules\Certification\Listeners;

use App\Modules\Learning\Domain\Events\EnrollmentCompleted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

final class IssueCertificateOnCompletion implements ShouldQueue
{
    use InteractsWithQueue;

    public function __construct(private \App\Modules\Certification\Application\CertificateService $certificates)
    {
    }

    public function handle(EnrollmentCompleted $event): void
    {
        $this->certificates->issue($event->enrollment);
    }
}
