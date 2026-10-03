<?php

namespace App\Modules\Enrollment\Application;

use App\Models\Enrollment;
use App\Modules\Enrollment\Domain\Events\TraineeSelfRegistered;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use App\Shared\Application\EventBus;
use DomainException;
use Illuminate\Support\Facades\DB;

final readonly class TraineeSelfRegistrationService
{
    public function __construct(
        private TraineeRegistrationService $registration,
        private EnrollmentService $enrollment,
        private EventBus $events,
    ) {}

    /**
     * Register a trainee from the public form and enroll them in the chosen cohort.
     * Both steps share one transaction so a full cohort leaves no orphan trainee record.
     */
    public function register(array $data): Enrollment
    {
        return DB::transaction(function () use ($data) {
            $alreadyRegistered = Trainee::query()
                ->where('phone', $data['phone'])
                ->whereRaw('LOWER(full_name) = ?', [mb_strtolower(trim($data['full_name']))])
                ->exists();

            if ($alreadyRegistered) {
                throw new DomainException('You are already registered. Please contact the office to join another class.');
            }

            $trainee = $this->registration->register([...$data, 'registration_source' => 'self'], null);

            $enrollment = $this->enrollment
                ->enroll($trainee, (int) $data['cohort_id'], null)
                ->load('trainee', 'cohort');

            $this->events->dispatch(new TraineeSelfRegistered($enrollment));

            return $enrollment;
        });
    }
}
