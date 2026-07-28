<?php

namespace App\Modules\Learning\Application;

use App\Models\Enrollment;
use App\Models\User;
use App\Modules\Audit\Application\AuditLogger;
use App\Modules\Learning\Domain\Events\EnrollmentCompleted;
use App\Shared\Application\EventBus;
use Illuminate\Support\Facades\DB;
use App\Modules\Learning\Domain\Events\EnrollmentProgressUpdated;
use DomainException;

final readonly class ProgressService
{
    public function __construct(
        private EventBus $events,
        private AuditLogger $audit,
    ) {
    }

    public function complete(Enrollment $enrollment, User $actor): Enrollment
    {
        if (!in_array($enrollment->status, ['active', 'ongoing', 'paused'], true)) {
            throw new DomainException('Only a current enrollment can be completed.');
        }

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

    public function update(Enrollment $enrollment, float $percentage, string $status, User $actor): Enrollment
    {
        if (in_array($enrollment->status, ['completed', 'withdrawn', 'transferred'], true)) {
            throw new DomainException('Closed enrollment progress cannot be changed.');
        }
        if ($status === 'completed') {
            throw new DomainException('Use the completion action to complete an enrollment.');
        }

        $before = $enrollment->toArray();
        $enrollment->update([
            'progress_percentage' => $percentage,
            'status' => $status,
        ]);
        $this->audit->record($actor, 'enrollment.progress_updated', $enrollment, $before, $enrollment->fresh()->toArray());
        $this->events->dispatch(new EnrollmentProgressUpdated($enrollment));

        return $enrollment;
    }
}
