<?php

namespace App\Modules\Enrollment\Application;

use App\Modules\Enrollment\Domain\Events\TraineeSelfRegistered;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use App\Shared\Application\EventBus;
use DomainException;
use Illuminate\Support\Facades\DB;

final readonly class TraineeSelfRegistrationService
{
    public function __construct(
        private TraineeRegistrationService $registration,
        private EventBus $events,
    ) {}

    /**
     * Register a trainee from the public form with the course they want to take.
     * Start dates are flexible, so no enrollment is created here: the office enrolls
     * the trainee into a cohort once their schedule is agreed.
     */
    public function register(array $data): Trainee
    {
        return DB::transaction(function () use ($data) {
            $alreadyRegistered = Trainee::query()
                ->where('phone', $data['phone'])
                ->whereRaw('LOWER(full_name) = ?', [mb_strtolower(trim($data['full_name']))])
                ->exists();

            if ($alreadyRegistered) {
                throw new DomainException('You are already registered. Please contact the office to join another course.');
            }

            $trainee = $this->registration->register([
                ...$data,
                'registration_source' => 'self',
                'requested_program_level_id' => $data['program_level_id'],
            ], null)->load('requestedLevel.program');

            $this->events->dispatch(new TraineeSelfRegistered($trainee));

            return $trainee;
        });
    }
}
