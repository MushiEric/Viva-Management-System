<?php

namespace App\Modules\Communication\Listeners;

use App\Models\User;
use App\Modules\Communication\Notifications\PortalNotification;
use App\Modules\Enrollment\Domain\Events\TraineeSelfRegistered;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Throwable;

final class NotifyStaffOfSelfRegistration implements ShouldQueueAfterCommit
{
    use InteractsWithQueue;

    public function handle(TraineeSelfRegistered $event): void
    {
        $trainee = $event->trainee;
        $course = $trainee->requestedLevel?->displayName() ?? 'a course';
        $staff = User::query()
            ->whereIn('role', ['manager', 'admin'])
            ->where('status', 'approved')
            ->get();

        try {
            foreach ($staff as $user) {
                $user->notify(new PortalNotification(
                    'trainee',
                    'New Trainee Self-Registration',
                    "{$trainee->full_name} ({$trainee->trainee_number}) registered online for {$course} and is waiting to be enrolled in a class.",
                    "/trainees/{$trainee->id}",
                    ['trainee_id' => $trainee->id, 'program_level_id' => $trainee->requested_program_level_id],
                ));
            }
        } catch (Throwable $e) {
            Log::error('Failed to notify staff of trainee self-registration: '.$e->getMessage());
        }
    }
}
