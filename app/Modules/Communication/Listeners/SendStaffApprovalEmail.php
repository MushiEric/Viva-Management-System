<?php

namespace App\Modules\Communication\Listeners;

use App\Modules\Identity\Domain\Events\StaffAccountApproved;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;

final class SendStaffApprovalEmail implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(StaffAccountApproved $event): void
    {
        Mail::raw(
            "Hello {$event->staff->name}, your VIVA DIGITAL CENTER staff account has been approved.",
            fn ($message) => $message
                ->to($event->staff->email)
                ->subject('Staff Account Approved'),
        );
    }
}
