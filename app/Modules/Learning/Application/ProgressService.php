<?php

namespace App\Modules\Learning\Application;

use App\Models\Enrollment;
use App\Models\User;
use App\Modules\Audit\Application\AuditLogger;
use App\Modules\Learning\Domain\Events\EnrollmentCompleted;
use App\Shared\Application\EventBus;
use Illuminate\Support\Facades\DB;

final readonly class ProgressService
{
    public function __construct(
        private EventBus $events,
        private AuditLogger $audit,
    ) {
    }

    public function complete(Enrollment $enrollment, User $actor): Enrollment
    {
        return DB::transaction(function () use ($enrollment, $actor) {
            $before = $enrollment->toArray();
            $enrollment->update([
                'status' => 'completed',
                'progress_percentage' => 100,
                'completed_at' => now(),
                'ended_at' => now(),
            ]);
            $this->audit->record($actor, 'enrollment.completed', $enrollment, $before, $enrollment->fresh()->toArray());
            $this->events->dispatch(new EnrollmentCompleted($enrollment));

            return $enrollment;
        });
    }
}
