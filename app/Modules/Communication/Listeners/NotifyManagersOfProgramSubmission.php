<?php

namespace App\Modules\Communication\Listeners;

use App\Models\User;
use App\Modules\Communication\Notifications\PortalNotification;
use App\Modules\Training\Domain\Events\ProgramSubmittedForApproval;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;

final class NotifyManagersOfProgramSubmission implements ShouldHandleEventsAfterCommit
{
    public function handle(ProgramSubmittedForApproval $event): void
    {
        $managers = User::query()
            ->where('role', 'manager')
            ->where('status', 'approved')
            ->get();

        foreach ($managers as $manager) {
            $manager->notify(new PortalNotification(
                'program',
                'Program Approval Required',
                "Program \"{$event->program->name}\" is awaiting your review.",
                '/programs',
                ['program_id' => $event->program->id],
            ));
        }
    }
}
