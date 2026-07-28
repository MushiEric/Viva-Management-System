<?php

namespace App\Modules\Communication\Listeners;

use App\Models\User;
use App\Modules\Training\Domain\Events\ProgramSubmittedForApproval;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;

final class NotifyManagersOfProgramSubmission implements ShouldQueueAfterCommit
{
    use InteractsWithQueue;

    public function handle(ProgramSubmittedForApproval $event): void
    {
        $emails = User::query()
            ->where('role', 'manager')
            ->where('status', 'approved')
            ->pluck('email')
            ->all();

        if ($emails === []) {
            return;
        }

        Mail::raw(
            "Program \"{$event->program->name}\" is awaiting your review.",
            fn ($message) => $message->to($emails)->subject('Program Approval Required'),
        );
    }
}
