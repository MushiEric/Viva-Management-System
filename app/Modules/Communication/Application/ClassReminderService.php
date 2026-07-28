<?php

namespace App\Modules\Communication\Application;

use App\Models\Enrollment;
use App\Modules\Communication\Domain\Events\ClassReminderDue;
use App\Modules\Communication\Infrastructure\Models\ReminderDelivery;
use App\Shared\Application\EventBus;
use Carbon\CarbonImmutable;

final readonly class ClassReminderService
{
    public function __construct(private EventBus $events)
    {
    }

    public function queueForDate(CarbonImmutable $sessionDate): int
    {
        $dayOfWeek = $sessionDate->dayOfWeekIso;
        if ($dayOfWeek === 7) {
            return 0;
        }

        $enrollments = Enrollment::query()
            ->whereIn('status', ['active', 'ongoing'])
            ->whereHas('cohort', function ($query) use ($sessionDate, $dayOfWeek) {
                $query->where('is_active', true)
                    ->whereDate('start_date', '<=', $sessionDate)
                    ->whereDate('end_date', '>=', $sessionDate)
                    ->whereHas('scheduleDays', fn ($query) => $query->where('day_of_week', $dayOfWeek));
            })
            ->whereHas('trainee', fn ($query) => $query->whereNotNull('email'))
            ->with(['trainee', 'cohort.programLevel.program', 'cohort.scheduleDays'])
            ->get();

        $queued = 0;
        foreach ($enrollments as $enrollment) {
            $exists = ReminderDelivery::query()
                ->where('enrollment_id', $enrollment->id)
                ->whereDate('session_date', $sessionDate)
                ->where('channel', 'email')
                ->exists();
            if ($exists) {
                continue;
            }

            $delivery = ReminderDelivery::create([
                'enrollment_id' => $enrollment->id,
                'session_date' => $sessionDate->toDateString(),
                'channel' => 'email',
                'status' => 'queued',
                'queued_at' => now(),
            ]);
            $this->events->dispatch(new ClassReminderDue($delivery));
            $queued++;
        }

        return $queued;
    }
}
