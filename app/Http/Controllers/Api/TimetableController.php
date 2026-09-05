<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cohort;
use Carbon\CarbonImmutable;

class TimetableController extends Controller
{
    /**
     * Get JSON list of active timetables.
     */
    public function index()
    {
        $cohorts = Cohort::where('is_active', true)
            ->with(['course.parent', 'programLevel.program', 'scheduleDays', 'facilitators:id,name'])
            ->withCount(['enrollments' => fn ($query) => $query->whereIn('status', ['pending', 'active', 'ongoing'])])
            ->get()
            ->map(function ($cohort) {
                $enrolled = $cohort->enrollments_count;
                $total = $cohort->max_seats;
                $available = max(0, $total - $enrolled);

                $level = $cohort->programLevel;
                $legacyCourse = $cohort->course;
                $program = $level?->program;
                $programId = $program?->id ?? $legacyCourse?->parent_id ?? $legacyCourse?->id;
                $programName = $program?->name ?? $legacyCourse?->parent?->name ?? $legacyCourse?->name;
                $levelId = $level?->id ?? ($legacyCourse?->parent_id ? $legacyCourse->id : null);
                $levelName = $level?->name ?? ($legacyCourse?->parent_id ? $legacyCourse->name : null);
                $month = $cohort->start_date
                    ? CarbonImmutable::parse($cohort->start_date)->format('M')
                    : null;
                $displayName = collect([$programName, $month, $levelName])
                    ->filter()
                    ->implode(' · ');

                return [
                    'cohort_id' => $cohort->id,
                    'cohort_name' => $cohort->name,
                    'cohort' => [
                        'id' => $cohort->id,
                        'name' => $cohort->name,
                        'display_name' => $displayName ?: $cohort->name,
                    ],
                    'program' => [
                        'id' => $programId,
                        'name' => $programName,
                    ],
                    'level' => [
                        'id' => $levelId,
                        'name' => $levelName,
                        'description' => $level?->description,
                        'syllabus_outline' => $level?->syllabus_outline ?? [],
                        'fee_tzs' => $level?->fee_tzs,
                    ],
                    'schedule_window' => $cohort->schedule_window,
                    'start_date' => $cohort->start_date,
                    'end_date' => $cohort->end_date,
                    'default_start_time' => $cohort->default_start_time,
                    'default_end_time' => $cohort->default_end_time,
                    'schedule_days' => $cohort->scheduleDays->map(fn ($day) => [
                        'day_of_week' => $day->day_of_week,
                        'day_name' => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][$day->day_of_week - 1],
                        'start_time' => $day->start_time,
                        'end_time' => $day->end_time,
                    ]),
                    'facilitators' => $cohort->facilitators->map->only(['id', 'name']),
                    'course' => [
                        'id' => $level?->id ?? $legacyCourse?->id,
                        'name' => $level?->name ?? $legacyCourse?->name,
                        'is_module' => (bool) ($level || $legacyCourse?->parent_id),
                        'parent_course' => $level?->program?->name ?? $legacyCourse?->parent?->name,
                        'fee_tzs' => $level?->fee_tzs,
                    ],
                    'capacity' => [
                        'max_seats' => $total,
                        'occupied_seats' => $enrolled,
                        'available_seats' => $available,
                        'status' => $available > 0 ? 'available' : 'full',
                    ],
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $cohorts,
        ]);
    }
}
