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
use App\Modules\Enrollment\Infrastructure\Models\EnrollmentTransfer;

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

    public function transfer(Enrollment $original, int $targetCohortId, string $reason, User $actor): Enrollment
    {
        return DB::transaction(function () use ($original, $targetCohortId, $reason, $actor) {
            if (!in_array($original->status, ['pending', 'active', 'ongoing'], true)) {
                throw new DomainException('Only a current enrollment can be transferred.');
            }
            if ($original->cohort_id === $targetCohortId) {
                throw new DomainException('The target cohort must be different from the current cohort.');
            }

            $replacement = $this->enroll($original->trainee, $targetCohortId, $actor);
            $replacement->update([
                'progress_percentage' => $original->progress_percentage,
            ]);

            foreach (['assessments', 'practical_works', 'enrollment_notes', 'attendance_records', 'invoice_items'] as $table) {
                DB::table($table)
                    ->where('enrollment_id', $original->id)
                    ->update(['enrollment_id' => $replacement->id]);
            }

            $before = $original->toArray();
            $original->update([
                'status' => 'transferred',
                'transferred_to_enrollment_id' => $replacement->id,
                'ended_at' => now(),
            ]);

            EnrollmentTransfer::create([
                'from_enrollment_id' => $original->id,
                'to_enrollment_id' => $replacement->id,
                'transferred_by' => $actor->id,
                'reason' => $reason,
                'created_at' => now(),
            ]);

            $this->audit->record($actor, 'enrollment.transferred', $original, $before, $original->fresh()->toArray());
            $this->events->dispatch(new EnrollmentTransferred($original, $replacement));

            return $replacement;
        });
    }
}
