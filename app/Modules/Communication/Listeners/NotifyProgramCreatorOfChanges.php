<?php

namespace App\Modules\Communication\Listeners;

use App\Modules\Training\Domain\Events\ProgramChangesRequested;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;

final class NotifyProgramCreatorOfChanges implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(ProgramChangesRequested $event): void
    {
        $creator = $event->program->creator;

        Mail::raw(
            "Changes were requested for \"{$event->program->name}\": {$event->program->review_notes}",
            fn ($message) => $message->to($creator->email)->subject('Program Changes Requested'),
        );
    }
}
