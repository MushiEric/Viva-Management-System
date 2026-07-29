<?php

namespace App\Modules\Communication\Domain\Events;

use App\Modules\Communication\Infrastructure\Models\ContactInquiry;
use App\Shared\Domain\DomainEvent;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class ContactInquirySubmitted implements DomainEvent
{
    use Dispatchable, SerializesModels;

    public function __construct(public ContactInquiry $inquiry) {}
}
