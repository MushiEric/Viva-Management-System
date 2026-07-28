<?php

namespace App\Modules\Training\Application;

use App\Models\Cohort;
use App\Models\User;
use App\Modules\Audit\Application\AuditLogger;
use App\Modules\Training\Domain\Events\CohortScheduled;
use App\Modules\Training\Infrastructure\Models\ProgramLevel;
use App\Shared\Application\EventBus;
use DomainException;
use Illuminate\Support\Facades\DB;

final readonly class CohortSchedulingService
{
    private const DEFAULT_TIMES = [
        'morning' => ['08:30', '10:30'],
        'afternoon' => ['14:00', '16:00'],
        'evening' => ['18:30', '20:30'],
        'weekend' => ['09:00', '11:00'],
        'custom' => [null, null],
    ];

    public function __construct(
        private AuditLogger $audit,
        private EventBus $events,
    ) {
    }

    public function create(array $data, User $actor): Cohort
    {
        return DB::transaction(function () use ($data, $actor) {
            $level = ProgramLevel::with('program')->findOrFail($data['program_level_id']);
            $this->assertLevelAvailable($level);
            [$startTime, $endTime] = $this->resolveDefaultTimes($data);

            $cohort = Cohort::create([
                'course_id' => null,
                'program_level_id' => $level->id,
                'name' => $data['name'],
                'schedule_window' => $data['schedule_window'],
                'max_seats' => 7,
                'is_active' => $data['is_active'] ?? true,
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'default_start_time' => $startTime,
                'default_end_time' => $endTime,
            ]);

            $this->syncDays($cohort, $data['schedule_days'], $startTime, $endTime);
            $cohort->facilitators()->sync($data['facilitator_ids']);
            $this->audit->record($actor, 'cohort.created', $cohort, null, $cohort->load('scheduleDays', 'facilitators')->toArray());
            $this->events->dispatch(new CohortScheduled($cohort));

            return $cohort->load('programLevel.program', 'scheduleDays', 'facilitators');
        });
    }

    public function update(Cohort $cohort, array $data, User $actor): Cohort
    {
        return DB::transaction(function () use ($cohort, $data, $actor) {
            $level = ProgramLevel::with('program')->findOrFail($data['program_level_id']);
            $this->assertLevelAvailable($level);
            [$startTime, $endTime] = $this->resolveDefaultTimes($data);
            $before = $cohort->load('scheduleDays', 'facilitators')->toArray();

            $cohort->update([
                'program_level_id' => $level->id,
                'name' => $data['name'],
                'schedule_window' => $data['schedule_window'],
                'max_seats' => 7,
                'is_active' => $data['is_active'] ?? $cohort->is_active,
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'default_start_time' => $startTime,
                'default_end_time' => $endTime,
            ]);

            $this->syncDays($cohort, $data['schedule_days'], $startTime, $endTime);
            $cohort->facilitators()->sync($data['facilitator_ids']);
            $this->audit->record($actor, 'cohort.updated', $cohort, $before, $cohort->fresh()->load('scheduleDays', 'facilitators')->toArray());

            return $cohort->fresh()->load('programLevel.program', 'scheduleDays', 'facilitators');
        });
    }

    public function deactivate(Cohort $cohort, User $actor): void
    {
        $before = $cohort->toArray();
        $cohort->update(['is_active' => false]);
        $cohort->delete();
        $this->audit->record($actor, 'cohort.deactivated', $cohort, $before, $cohort->toArray());
    }

    private function assertLevelAvailable(ProgramLevel $level): void
    {
        if ($level->program->status !== 'approved') {
            throw new DomainException('Only approved programs can be scheduled.');
        }
        if ($level->fee_status !== 'approved') {
            throw new DomainException('The program level fee must be approved before scheduling.');
        }
    }

    private function resolveDefaultTimes(array $data): array
    {
        $defaults = self::DEFAULT_TIMES[$data['schedule_window']];
        $start = $data['default_start_time'] ?? $defaults[0];
        $end = $data['default_end_time'] ?? $defaults[1];

        if (!$start || !$end || $start >= $end) {
            throw new DomainException('A valid default start and end time is required.');
        }

        return [$start, $end];
    }

    private function syncDays(Cohort $cohort, array $days, string $defaultStart, string $defaultEnd): void
    {
        $cohort->scheduleDays()->delete();

        foreach ($days as $day) {
            $start = $day['start_time'] ?? $defaultStart;
            $end = $day['end_time'] ?? $defaultEnd;

            if ($start >= $end) {
                throw new DomainException('Every session start time must be before its end time.');
            }

            $cohort->scheduleDays()->create([
                'day_of_week' => $day['day_of_week'],
                'start_time' => $start,
                'end_time' => $end,
            ]);
        }
    }
}
