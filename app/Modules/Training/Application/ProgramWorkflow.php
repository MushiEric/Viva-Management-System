<?php

namespace App\Modules\Training\Application;

use App\Models\User;
use App\Modules\Audit\Application\AuditLogger;
use App\Modules\Training\Domain\Events\ProgramSubmittedForApproval;
use App\Modules\Training\Domain\Events\ProgramApproved;
use App\Modules\Training\Domain\Events\ProgramChangesRequested;
use App\Modules\Training\Infrastructure\Models\Program;
use App\Shared\Application\EventBus;
use Illuminate\Support\Facades\DB;
use DomainException;

final readonly class ProgramWorkflow
{
    public function __construct(
        private EventBus $events,
        private AuditLogger $audit,
    ) {
    }

    public function submit(Program $program, User $actor): Program
    {
        if (!$program->levels()->exists()) {
            throw new DomainException('Add at least one program level before submitting for approval.');
        }

        return DB::transaction(function () use ($program, $actor) {
            $before = $program->toArray();
            $program->update(['status' => 'pending_approval', 'review_notes' => null]);
            $this->audit->record($actor, 'program.submitted', $program, $before, $program->fresh()->toArray());
            $this->events->dispatch(new ProgramSubmittedForApproval($program));

            return $program;
        });
    }

    public function approve(Program $program, User $manager): Program
    {
        if ($program->status !== 'pending_approval') {
            throw new DomainException('Only programs pending approval can be approved.');
        }

        return DB::transaction(function () use ($program, $manager) {
            $before = $program->toArray();
            $program->update([
                'status' => 'approved',
                'approved_by' => $manager->id,
                'approved_at' => now(),
                'review_notes' => null,
            ]);
            $this->audit->record($manager, 'program.approved', $program, $before, $program->fresh()->toArray());
            $this->events->dispatch(new ProgramApproved($program));

            return $program;
        });
    }

    public function requestChanges(Program $program, User $manager, string $notes): Program
    {
        if ($program->status !== 'pending_approval') {
            throw new DomainException('Changes can only be requested for programs pending approval.');
        }

        $before = $program->toArray();
        $program->update(['status' => 'changes_requested', 'review_notes' => $notes]);
        $this->audit->record($manager, 'program.changes_requested', $program, $before, $program->fresh()->toArray());
        $this->events->dispatch(new ProgramChangesRequested($program));

        return $program;
    }
}
