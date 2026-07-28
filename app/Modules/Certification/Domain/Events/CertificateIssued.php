<?php

namespace App\Modules\Certification\Domain\Events;

use App\Modules\Certification\Infrastructure\Models\Certificate;
use App\Shared\Domain\DomainEvent;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class CertificateIssued implements DomainEvent
{
    use Dispatchable, SerializesModels;

    public function __construct(public Certificate $certificate)
    {
    }
}
