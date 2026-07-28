<?php

namespace App\Modules\Communication\Listeners;

use App\Modules\Training\Domain\Events\ProgramApproved;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;

final class NotifyProgramCreatorOfApproval implements ShouldQueueAfterCommit
{
    use InteractsWithQueue;

    public function handle(ProgramApproved $event): void
    {
        $creator = $event->program->creator;

        Mail::raw(
            "Your program \"{$event->program->name}\" has been approved.",
            fn ($message) => $message->to($creator->email)->subject('Program Approved'),
        );
    }
}
