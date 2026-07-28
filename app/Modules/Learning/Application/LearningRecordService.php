<?php

namespace App\Modules\Learning\Application;

use App\Models\Enrollment;
use App\Models\User;
use App\Modules\Audit\Application\AuditLogger;
use App\Modules\Learning\Domain\Events\LearningRecordAdded;
use App\Modules\Learning\Infrastructure\Models\Assessment;
use App\Modules\Learning\Infrastructure\Models\AttendanceRecord;
use App\Modules\Learning\Infrastructure\Models\EnrollmentNote;
use App\Modules\Learning\Infrastructure\Models\PracticalWork;
use App\Shared\Application\EventBus;
use DomainException;

final readonly class LearningRecordService
{
    public function __construct(
        private AuditLogger $audit,
        private EventBus $events,
    ) {
    }

    public function addAssessment(Enrollment $enrollment, array $data, User $actor): Assessment
    {
        $this->assertRecordable($enrollment);
        $assessment = $enrollment->assessments()->create([
            'title' => $data['title'],
            'percentage' => $data['percentage'],
            'feedback' => $data['feedback'] ?? null,
            'recorded_by' => $actor->id,
            'assessed_at' => $data['assessed_at'] ?? now(),
        ]);
        $this->record($actor, $enrollment, 'assessment', $assessment);

        return $assessment;
    }

    public function addPracticalWork(Enrollment $enrollment, array $data, User $actor): PracticalWork
    {
        $this->assertRecordable($enrollment);
        $work = $enrollment->practicalWorks()->create([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'outcome' => $data['outcome'] ?? null,
            'percentage' => $data['percentage'] ?? null,
            'recorded_by' => $actor->id,
            'completed_at' => $data['completed_at'] ?? null,
        ]);
        $this->record($actor, $enrollment, 'practical_work', $work);

        return $work;
    }

    public function addNote(Enrollment $enrollment, string $note, User $actor): EnrollmentNote
    {
        $this->assertRecordable($enrollment);
        $record = $enrollment->notes()->create(['note' => $note, 'recorded_by' => $actor->id]);
        $this->record($actor, $enrollment, 'note', $record);

        return $record;
    }

    public function recordAttendance(Enrollment $enrollment, array $data, User $actor): AttendanceRecord
    {
        $this->assertRecordable($enrollment);
        $attendance = $enrollment->attendanceRecords()
            ->whereDate('session_date', $data['session_date'])
            ->first() ?? new AttendanceRecord([
                'enrollment_id' => $enrollment->id,
                'session_date' => $data['session_date'],
            ]);
        $attendance->fill([
            'status' => $data['status'],
            'notes' => $data['notes'] ?? null,
            'recorded_by' => $actor->id,
        ])->save();
        $this->record($actor, $enrollment, 'attendance', $attendance);

        return $attendance;
    }

    private function assertRecordable(Enrollment $enrollment): void
    {
        if (!in_array($enrollment->status, ['pending', 'active', 'ongoing', 'paused'], true)) {
            throw new DomainException('Learning records cannot be added to a closed enrollment.');
        }
    }

    private function record(User $actor, Enrollment $enrollment, string $type, \Illuminate\Database\Eloquent\Model $record): void
    {
        $this->audit->record($actor, "learning.{$type}_recorded", $record, null, $record->toArray());
        $this->events->dispatch(new LearningRecordAdded($enrollment, $type, $record->getKey()));
    }
}
