<?php

namespace App\Modules\Communication\Listeners;

use App\Mail\ContactInquiryConfirmation;
use App\Models\User;
use App\Modules\Communication\Domain\Events\ContactInquirySubmitted;
use App\Modules\Communication\Notifications\PortalNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;

final class SendContactInquiryEmails implements ShouldQueueAfterCommit
{
    use InteractsWithQueue;

    public function handle(ContactInquirySubmitted $event): void
    {
        $inquiry = $event->inquiry;
        $staff = User::query()
            ->whereIn('role', ['manager', 'admin'])
            ->where('status', 'approved')
            ->get();

        foreach ($staff as $user) {
            $user->notify(new PortalNotification(
                'enquiry',
                'New Website Enquiry',
                "{$inquiry->name} submitted an enquiry about {$inquiry->program_of_interest}.",
                '/enquiries',
                ['inquiry_id' => $inquiry->id],
            ));
        }

        Mail::to($inquiry->email)->send(new ContactInquiryConfirmation($inquiry));
    }
}
