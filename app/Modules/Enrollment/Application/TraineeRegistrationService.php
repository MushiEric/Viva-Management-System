<?php

namespace App\Modules\Enrollment\Application;

use App\Models\User;
use App\Modules\Audit\Application\AuditLogger;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use Carbon\CarbonImmutable;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

final readonly class TraineeRegistrationService
{
    public function __construct(private AuditLogger $audit) {}

    public function register(array $data, User $actor): Trainee
    {
        $documentPath = isset($data['registration_form'])
            ? $data['registration_form']->store('trainee-registration-forms', 'local')
            : null;

        try {
            return DB::transaction(function () use ($data, $actor, $documentPath) {
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
                    'phone' => $data['phone'],
                    'email' => $data['email'] ?? null,
                    'tin' => $data['tin'] ?? null,
                    'address' => $data['address'],
                    'occupation' => $data['occupation'] ?? null,
                    'registration_form_path' => $documentPath,
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
        } catch (Throwable $exception) {
            if ($documentPath) {
                Storage::disk('local')->delete($documentPath);
            }

            throw $exception;
        }
    }

    public function update(Trainee $trainee, array $data, User $actor): Trainee
    {
        $oldDocumentPath = $trainee->registration_form_path;
        $newDocumentPath = isset($data['registration_form'])
            ? $data['registration_form']->store('trainee-registration-forms', 'local')
            : null;

        try {
            $updated = DB::transaction(function () use ($trainee, $data, $actor, $newDocumentPath) {
                $isMinor = CarbonImmutable::parse($data['date_of_birth'])->age < 18;
                $emergency = $data['emergency_contact'] ?? null;

                if ($isMinor && empty($emergency)) {
                    throw new DomainException('Emergency contact information is required for a minor.');
                }

                $before = $trainee->load('emergencyContact')->toArray();
                $trainee->update([
                    'full_name' => $data['full_name'],
                    'date_of_birth' => $data['date_of_birth'],
                    'gender' => $data['gender'],
                    'phone' => $data['phone'],
                    'email' => $data['email'] ?? null,
                    'tin' => $data['tin'] ?? null,
                    'address' => $data['address'],
                    'occupation' => $data['occupation'] ?? null,
                    'registration_form_path' => $newDocumentPath ?? $trainee->registration_form_path,
                ]);

                if ($emergency) {
                    $trainee->emergencyContact()->updateOrCreate([], $emergency);
                } elseif (! $isMinor) {
                    $trainee->emergencyContact()->delete();
                }

                $this->audit->record($actor, 'trainee.updated', $trainee, $before, $trainee->fresh()->load('emergencyContact')->toArray());

                return $trainee->fresh()->load('emergencyContact');
            });
        } catch (Throwable $exception) {
            if ($newDocumentPath) {
                Storage::disk('local')->delete($newDocumentPath);
            }

            throw $exception;
        }

        if ($newDocumentPath && $oldDocumentPath) {
            Storage::disk('local')->delete($oldDocumentPath);
        }

        return $updated;
    }

    public function deactivate(Trainee $trainee, User $actor): void
    {
        $activeEnrollment = $trainee->enrollments()
            ->whereIn('status', ['pending', 'active', 'ongoing'])
            ->exists();

        if ($activeEnrollment) {
            throw new DomainException('A trainee with an active enrollment cannot be deactivated.');
        }

        $before = $trainee->toArray();
        $trainee->delete();
        $this->audit->record($actor, 'trainee.deactivated', $trainee, $before, $trainee->toArray());
    }
}
