<?php

namespace App\Modules\Learning\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Modules\Learning\Application\LearningRecordService;
use App\Modules\Learning\Application\ProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class LearningController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $enrollments = Enrollment::query()
            ->whereNotNull('trainee_id')
            ->with(['trainee:id,trainee_number,full_name', 'cohort.programLevel.program'])
            ->when($request->string('status')->toString(), fn ($query, string $status) => $query->where('status', $status))
            ->when($request->integer('cohort_id'), fn ($query, int $cohortId) => $query->where('cohort_id', $cohortId))
            ->latest('enrolled_at')
            ->paginate($request->integer('per_page', 30));

        return response()->json(['success' => true, 'data' => $enrollments]);
    }

    public function show(Enrollment $enrollment): JsonResponse
    {
        $enrollment->load([
            'trainee',
            'cohort.programLevel.program',
            'assessments' => fn ($query) => $query->latest('assessed_at'),
            'practicalWorks' => fn ($query) => $query->latest(),
            'notes' => fn ($query) => $query->latest(),
            'attendanceRecords' => fn ($query) => $query->latest('session_date'),
        ]);

        return response()->json(['success' => true, 'data' => $enrollment]);
    }

    public function assessment(Request $request, Enrollment $enrollment, LearningRecordService $service): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'percentage' => ['required', 'numeric', 'between:0,100'],
            'feedback' => ['nullable', 'string', 'max:5000'],
            'assessed_at' => ['nullable', 'date'],
        ]);

        return response()->json(['success' => true, 'data' => $service->addAssessment($enrollment, $validated, $request->user())], 201);
    }

    public function practicalWork(Request $request, Enrollment $enrollment, LearningRecordService $service): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'outcome' => ['nullable', 'string', 'max:5000'],
            'percentage' => ['nullable', 'numeric', 'between:0,100'],
            'completed_at' => ['nullable', 'date'],
        ]);

        return response()->json(['success' => true, 'data' => $service->addPracticalWork($enrollment, $validated, $request->user())], 201);
    }

    public function note(Request $request, Enrollment $enrollment, LearningRecordService $service): JsonResponse
    {
        $validated = $request->validate(['note' => ['required', 'string', 'max:5000']]);

        return response()->json(['success' => true, 'data' => $service->addNote($enrollment, $validated['note'], $request->user())], 201);
    }

    public function attendance(Request $request, Enrollment $enrollment, LearningRecordService $service): JsonResponse
    {
        $validated = $request->validate([
            'session_date' => ['required', 'date'],
            'status' => ['required', Rule::in(['present', 'absent', 'late', 'excused'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        return response()->json(['success' => true, 'data' => $service->recordAttendance($enrollment, $validated, $request->user())], 201);
    }

    public function progress(Request $request, Enrollment $enrollment, ProgressService $service): JsonResponse
    {
        $validated = $request->validate([
            'percentage' => ['required', 'numeric', 'between:0,99.99'],
            'status' => ['required', Rule::in(['pending', 'active', 'ongoing', 'paused'])],
        ]);

        return response()->json([
            'success' => true,
            'data' => $service->update($enrollment, (float) $validated['percentage'], $validated['status'], $request->user()),
        ]);
    }

    public function complete(Request $request, Enrollment $enrollment, ProgressService $service): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $service->complete($enrollment, $request->user())]);
    }
}
