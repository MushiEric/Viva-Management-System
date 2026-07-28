<?php

namespace App\Modules\Enrollment\Application;

use App\Models\Cohort;
use App\Models\Enrollment;
use App\Models\User;
use App\Modules\Audit\Application\AuditLogger;
use App\Modules\Enrollment\Domain\Events\EnrollmentTransferred;
use App\Modules\Enrollment\Domain\Events\TraineeEnrolled;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use App\Shared\Application\EventBus;
use DomainException;
use Illuminate\Support\Facades\DB;

final readonly class EnrollmentService
{
    public function __construct(
        private EventBus $events,
        private AuditLogger $audit,
    ) {
    }

    public function enroll(Trainee $trainee, int $cohortId, User $actor): Enrollment
    {
        return DB::transaction(function () use ($trainee, $cohortId, $actor) {
            $cohort = Cohort::lockForUpdate()->findOrFail($cohortId);
            $occupied = Enrollment::query()
                ->where('cohort_id', $cohort->id)
                ->whereIn('status', ['pending', 'active', 'ongoing'])
                ->count();

            if ($occupied >= $cohort->max_seats) {
                throw new DomainException("Lab at maximum capacity ({$cohort->max_seats}/{$cohort->max_seats} stations occupied) for this session.");
            }

            $duplicate = Enrollment::query()
                ->where('trainee_id', $trainee->id)
                ->where('cohort_id', $cohort->id)
                ->whereNotIn('status', ['cancelled', 'withdrawn', 'transferred'])
                ->exists();

            if ($duplicate) {
                throw new DomainException('Trainee is already enrolled in this cohort.');
            }

            $enrollment = Enrollment::create([
                'trainee_id' => $trainee->id,
                'cohort_id' => $cohort->id,
                'status' => 'active',
                'enrolled_at' => now(),
                'created_by' => $actor->id,
            ]);

            $this->audit->record($actor, 'trainee.enrolled', $enrollment, null, $enrollment->toArray());
            $this->events->dispatch(new TraineeEnrolled($enrollment));

            return $enrollment;
        });
    }

    public function transfer(Enrollment $original, int $targetCohortId, User $actor): Enrollment
    {
        return DB::transaction(function () use ($original, $targetCohortId, $actor) {
            $replacement = $this->enroll($original->trainee, $targetCohortId, $actor);
            $before = $original->toArray();
            $original->update([
                'status' => 'transferred',
                'transferred_to_enrollment_id' => $replacement->id,
                'ended_at' => now(),
            ]);

            $this->audit->record($actor, 'enrollment.transferred', $original, $before, $original->fresh()->toArray());
            $this->events->dispatch(new EnrollmentTransferred($original, $replacement));

            return $replacement;
        });
    }
}
