<?php

namespace App\Modules\Communication\Listeners;

use App\Modules\Communication\Notifications\PortalNotification;
use App\Modules\Training\Domain\Events\ProgramChangesRequested;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;

final class NotifyProgramCreatorOfChanges implements ShouldHandleEventsAfterCommit
{
    public function handle(ProgramChangesRequested $event): void
    {
        $creator = $event->program->creator;

        $creator?->notify(new PortalNotification(
            'program',
            'Program Changes Requested',
            "Changes were requested for \"{$event->program->name}\": {$event->program->review_notes}",
            '/programs',
            ['program_id' => $event->program->id],
        ));
    }
}
