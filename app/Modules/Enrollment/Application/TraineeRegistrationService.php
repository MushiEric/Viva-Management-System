<?php

namespace App\Modules\Enrollment\Application;

use App\Models\User;
use App\Modules\Audit\Application\AuditLogger;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use Carbon\CarbonImmutable;
use DomainException;
use Illuminate\Support\Facades\DB;

final readonly class TraineeRegistrationService
{
    public function __construct(private AuditLogger $audit)
    {
    }

    public function register(array $data, User $actor): Trainee
    {
        return DB::transaction(function () use ($data, $actor) {
            $isMinor = CarbonImmutable::parse($data['date_of_birth'])->age < 18;
            $emergency = $data['emergency_contact'] ?? null;

            if ($isMinor && empty($emergency)) {
                throw new DomainException('Emergency contact information is required for a minor.');
            }

            $trainee = Trainee::create([
                'trainee_number' => 'PENDING-'.str()->uuid(),
                'full_name' => $data['full_name'],
                'date_of_birth' => $data['date_of_birth'],
                'gender' => $data['gender'],
                'phone' => $data['phone'] ?? null,
                'email' => $data['email'] ?? null,
                'address' => $data['address'] ?? null,
                'occupation' => $data['occupation'] ?? null,
            ]);

            $trainee->update([
                'trainee_number' => sprintf('VDC-%s-%06d', now()->format('Y'), $trainee->id),
            ]);

            if ($emergency) {
                $trainee->emergencyContact()->create($emergency);
            }

            $this->audit->record($actor, 'trainee.created', $trainee, null, $trainee->fresh()->toArray());

            return $trainee->load('emergencyContact');
        });
    }
}
