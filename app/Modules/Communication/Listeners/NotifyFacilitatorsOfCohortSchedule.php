<?php

namespace App\Modules\Communication\Listeners;

use App\Modules\Training\Domain\Events\CohortScheduled;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;

final class NotifyFacilitatorsOfCohortSchedule implements ShouldQueueAfterCommit
{
    use InteractsWithQueue;

    public function handle(CohortScheduled $event): void
    {
        $cohort = $event->cohort->loadMissing('facilitators', 'programLevel.program');
        $emails = $cohort->facilitators->pluck('email')->filter()->all();

        if ($emails === []) {
            return;
        }

        $program = $cohort->programLevel->program->name;
        $level = $cohort->programLevel->name;

        Mail::raw(
            "You have been assigned to {$program} — {$level}, cohort {$cohort->name}, from {$cohort->start_date} to {$cohort->end_date}.",
            fn ($message) => $message->to($emails)->subject('New Cohort Assignment'),
        );
    }
}
