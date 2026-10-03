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
        $trainee = $event->enrollment->trainee;
        $cohort = $event->enrollment->cohort;
        $staff = User::query()
            ->whereIn('role', ['manager', 'admin'])
            ->where('status', 'approved')
            ->get();

        try {
            foreach ($staff as $user) {
                $user->notify(new PortalNotification(
                    'trainee',
                    'New Trainee Self-Registration',
                    "{$trainee->full_name} ({$trainee->trainee_number}) registered online and enrolled in {$cohort->name}.",
                    "/trainees/{$trainee->id}",
                    ['trainee_id' => $trainee->id, 'enrollment_id' => $event->enrollment->id],
                ));
            }
        } catch (Throwable $e) {
            Log::error('Failed to notify staff of trainee self-registration: '.$e->getMessage());
        }
    }
}
