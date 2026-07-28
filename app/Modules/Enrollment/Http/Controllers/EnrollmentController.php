<?php

namespace App\Modules\Enrollment\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Modules\Enrollment\Application\EnrollmentService;
use App\Modules\Enrollment\Http\Requests\EnrollTraineeRequest;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class EnrollmentController extends Controller
{
    public function store(EnrollTraineeRequest $request, EnrollmentService $service): JsonResponse
    {
        $trainee = Trainee::findOrFail($request->integer('trainee_id'));
        $enrollment = $service->enroll($trainee, $request->integer('cohort_id'), $request->user());

        return response()->json(['success' => true, 'data' => $enrollment], 201);
    }

    public function transfer(Request $request, Enrollment $enrollment, EnrollmentService $service): JsonResponse
    {
        $validated = $request->validate([
            'cohort_id' => ['required', 'exists:cohorts,id'],
            'reason' => ['required', 'string', 'max:2000'],
        ]);
        $replacement = $service->transfer(
            $enrollment,
            (int) $validated['cohort_id'],
            $validated['reason'],
            $request->user(),
        );

        return response()->json(['success' => true, 'data' => $replacement], 201);
    }
}
