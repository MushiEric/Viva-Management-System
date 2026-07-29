<?php

namespace App\Modules\Communication\Listeners;

use App\Mail\ContactInquiryConfirmation;
use App\Mail\ContactInquiryStaffNotification;
use App\Models\User;
use App\Modules\Communication\Domain\Events\ContactInquirySubmitted;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;

final class SendContactInquiryEmails implements ShouldQueueAfterCommit
{
    use InteractsWithQueue;

    public function handle(ContactInquirySubmitted $event): void
    {
        $inquiry = $event->inquiry;
        $staffEmails = User::query()
            ->whereIn('role', ['manager', 'admin'])
            ->where('status', 'approved')
            ->pluck('email')
            ->filter()
            ->all();

        if ($staffEmails !== []) {
            Mail::to($staffEmails)->send(new ContactInquiryStaffNotification($inquiry));
        }

        Mail::to($inquiry->email)->send(new ContactInquiryConfirmation($inquiry));
    }
}
