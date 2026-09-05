<?php

namespace App\Modules\Training\Application;

use App\Models\User;
use App\Modules\Audit\Application\AuditLogger;
use App\Modules\Training\Domain\Events\ProgramFeeApproved;
use App\Modules\Training\Infrastructure\Models\Program;
use App\Modules\Training\Infrastructure\Models\ProgramLevel;
use App\Shared\Application\EventBus;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

final readonly class ProgramManagementService
{
    public function __construct(
        private AuditLogger $audit,
        private EventBus $events,
    ) {}

    public function create(array $data, User $actor): Program
    {
        $imagePath = isset($data['image'])
            ? $data['image']->store('program-images', 'public')
            : null;

        try {
            $program = Program::create([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'image_path' => $imagePath,
                'status' => 'draft',
                'created_by' => $actor->id,
            ]);
        } catch (Throwable $exception) {
            if ($imagePath) {
                Storage::disk('public')->delete($imagePath);
            }

            throw $exception;
        }

        $this->audit->record($actor, 'program.created', $program, null, $program->toArray());

        return $program;
    }

    public function update(Program $program, array $data, User $actor): Program
    {
        $this->assertEditable($program, $actor);

        $oldImagePath = $program->image_path;
        $newImagePath = isset($data['image'])
            ? $data['image']->store('program-images', 'public')
            : null;
        $before = $program->toArray();

        try {
            $program->update([
                'name' => $data['name'] ?? $program->name,
                'description' => array_key_exists('description', $data) ? $data['description'] : $program->description,
                'image_path' => $newImagePath ?? $program->image_path,
            ]);
        } catch (Throwable $exception) {
            if ($newImagePath) {
                Storage::disk('public')->delete($newImagePath);
            }

            throw $exception;
        }

        if ($newImagePath && $oldImagePath) {
            Storage::disk('public')->delete($oldImagePath);
        }

        $this->audit->record($actor, 'program.updated', $program, $before, $program->fresh()->toArray());

        return $program;
    }

    public function addLevel(Program $program, array $data, User $actor): ProgramLevel
    {
        $this->assertEditable($program, $actor);

        return DB::transaction(function () use ($program, $data, $actor) {
            $level = $program->levels()->create([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'syllabus' => $data['syllabus'] ?? null,
                'syllabus_outline' => $data['syllabus_outline'],
                'duration_weeks' => $data['duration_weeks'] ?? 4,
                'training_days_per_week' => $data['training_days_per_week'] ?? 6,
                'fee_tzs' => $data['fee_tzs'],
                'fee_status' => 'pending_approval',
            ]);

            $level->prerequisites()->sync($data['prerequisite_level_ids'] ?? []);
            $level->facilitators()->sync($data['facilitator_ids'] ?? []);
            $this->audit->record($actor, 'program_level.created', $level, null, $level->load('prerequisites', 'facilitators')->toArray());

            return $level;
        });
    }

    public function updateLevel(ProgramLevel $level, array $data, User $actor): ProgramLevel
    {
        $level->loadMissing('program');
        $this->assertEditable($level->program, $actor);

        return DB::transaction(function () use ($level, $data, $actor) {
            $before = $level->load('prerequisites', 'facilitators')->toArray();
            $feeChanged = array_key_exists('fee_tzs', $data)
                && (float) $data['fee_tzs'] !== (float) $level->fee_tzs;

            $level->fill([
                'name' => $data['name'] ?? $level->name,
                'description' => array_key_exists('description', $data) ? $data['description'] : $level->description,
                'syllabus' => array_key_exists('syllabus', $data) ? $data['syllabus'] : $level->syllabus,
                'syllabus_outline' => $data['syllabus_outline'],
                'duration_weeks' => $data['duration_weeks'] ?? $level->duration_weeks,
                'training_days_per_week' => $data['training_days_per_week'] ?? $level->training_days_per_week,
                'fee_tzs' => $data['fee_tzs'] ?? $level->fee_tzs,
            ]);

            if ($feeChanged) {
                $level->fee_status = 'pending_approval';
                $level->fee_approved_by = null;
                $level->fee_approved_at = null;
            }

            $level->save();

            if (array_key_exists('prerequisite_level_ids', $data)) {
                if (in_array($level->id, $data['prerequisite_level_ids'], true)) {
                    throw new DomainException('A level cannot be its own prerequisite.');
                }
                $level->prerequisites()->sync($data['prerequisite_level_ids']);
            }
            if (array_key_exists('facilitator_ids', $data)) {
                $level->facilitators()->sync($data['facilitator_ids']);
            }

            $this->audit->record($actor, 'program_level.updated', $level, $before, $level->fresh()->load('prerequisites', 'facilitators')->toArray());

            return $level;
        });
    }

    public function approveFee(ProgramLevel $level, User $manager): ProgramLevel
    {
        if ($level->fee_status === 'approved') {
            throw new DomainException('Program level fee is already approved.');
        }

        $before = $level->toArray();
        $level->update([
            'fee_status' => 'approved',
            'fee_approved_by' => $manager->id,
            'fee_approved_at' => now(),
        ]);
        $this->audit->record($manager, 'program_level.fee_approved', $level, $before, $level->fresh()->toArray());
        $this->events->dispatch(new ProgramFeeApproved($level));

        return $level;
    }

    public function deactivate(Program $program, User $actor): void
    {
        $before = $program->toArray();
        $program->delete();
        $this->audit->record($actor, 'program.deactivated', $program, $before, $program->toArray());
    }

    private function assertEditable(Program $program, User $actor): void
    {
        if (! in_array($program->status, ['draft', 'changes_requested'], true)) {
            throw new DomainException('Only draft programs or programs with requested changes can be edited.');
        }

        if ($actor->role === 'facilitator' && $program->created_by !== $actor->id) {
            throw new DomainException('Facilitators can only edit programs they created.');
        }
    }
}
