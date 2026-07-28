<?php

namespace App\Modules\Communication\Listeners;

use App\Modules\Enrollment\Domain\Events\TraineeEnrolled;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;

final class SendEnrollmentConfirmation implements ShouldQueueAfterCommit
{
    use InteractsWithQueue;

    public function handle(TraineeEnrolled $event): void
    {
        $trainee = $event->enrollment->trainee;

        if (!$trainee?->email) {
            return;
        }

        Mail::raw(
            "Hello {$trainee->full_name}, your enrollment at VIVA DIGITAL CENTER has been recorded successfully.",
            fn ($message) => $message
                ->to($trainee->email)
                ->subject('VIVA DIGITAL CENTER Enrollment'),
        );
    }
}
