<?php

namespace App\Modules\Communication\Listeners;

use App\Modules\Communication\Notifications\PortalNotification;
use App\Modules\Training\Domain\Events\CohortScheduled;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;

final class NotifyFacilitatorsOfCohortSchedule implements ShouldHandleEventsAfterCommit
{
    public function handle(CohortScheduled $event): void
    {
        $cohort = $event->cohort->loadMissing('facilitators', 'programLevel.program');
        $program = $cohort->programLevel->program->name;
        $level = $cohort->programLevel->name;

        foreach ($cohort->facilitators as $facilitator) {
            $facilitator->notify(new PortalNotification(
                'cohort',
                'New Cohort Assignment',
                "You have been assigned to {$program} — {$level}, cohort {$cohort->name}, from {$cohort->start_date} to {$cohort->end_date}.",
                '/timetable',
                ['cohort_id' => $cohort->id],
            ));
        }
    }
}
