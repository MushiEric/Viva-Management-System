<?php

namespace App\Listeners;

use App\Events\StudentRegistered;
use App\Mail\WelcomeNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;

class SendWelcomeEmail implements ShouldQueueAfterCommit
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(StudentRegistered $event): void
    {
        $student = $event->student;
        $cohort = $event->cohort;

        $recipientEmail = null;

        if ($student->role === 'minor') {
            // Retrieve parent / manager email
            $manager = $student->manager;
            if ($manager && $manager->email) {
                $recipientEmail = $manager->email;
            }
        } else {
            // Standard student email
            $recipientEmail = $student->email;
        }

        if ($recipientEmail) {
            Mail::to($recipientEmail)->send(new WelcomeNotification($student, $cohort));
        }
    }
}
