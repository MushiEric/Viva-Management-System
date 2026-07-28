<?php

namespace App\Modules\Communication\Listeners;

use App\Modules\Communication\Domain\Events\ClassReminderDue;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;
use Throwable;

final class SendClassReminderEmail implements ShouldQueueAfterCommit
{
    use InteractsWithQueue;

    public int $tries = 3;

    public function handle(ClassReminderDue $event): void
    {
        $delivery = $event->delivery->loadMissing(
            'enrollment.trainee',
            'enrollment.cohort.programLevel.program',
            'enrollment.cohort.scheduleDays',
        );
        $enrollment = $delivery->enrollment;
        $trainee = $enrollment->trainee;
        $cohort = $enrollment->cohort;
        $day = $cohort->scheduleDays->firstWhere('day_of_week', $delivery->session_date->dayOfWeekIso);
        $program = $cohort->programLevel?->program?->name ?? $cohort->name;
        $level = $cohort->programLevel?->name;

        Mail::raw(
            "Hello {$trainee->full_name}, reminder: your {$program}".($level ? " — {$level}" : '')." session is tomorrow at ".substr($day->start_time, 0, 5).". VIVA DIGITAL CENTER, Ferry Kigamboni.",
            fn ($message) => $message
                ->to($trainee->email)
                ->subject('Class Reminder — VIVA DIGITAL CENTER'),
        );

        $delivery->update(['status' => 'sent', 'sent_at' => now(), 'failure_reason' => null]);
    }

    public function failed(ClassReminderDue $event, Throwable $exception): void
    {
        $event->delivery->update([
            'status' => 'failed',
            'failure_reason' => str($exception->getMessage())->limit(1000),
        ]);
    }
}
