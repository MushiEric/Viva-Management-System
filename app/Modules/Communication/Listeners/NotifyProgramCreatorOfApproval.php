<?php

namespace App\Modules\Communication\Listeners;

use App\Modules\Communication\Notifications\PortalNotification;
use App\Modules\Training\Domain\Events\ProgramApproved;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;

final class NotifyProgramCreatorOfApproval implements ShouldHandleEventsAfterCommit
{
    public function handle(ProgramApproved $event): void
    {
        $creator = $event->program->creator;

        $creator?->notify(new PortalNotification(
            'program',
            'Program Approved',
            "Your program \"{$event->program->name}\" has been approved.",
            '/programs',
            ['program_id' => $event->program->id],
        ));
    }
}
