<?php

namespace App\Modules\Training\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Cohort;
use App\Modules\Training\Application\CohortSchedulingService;
use App\Modules\Training\Http\Requests\StoreCohortRequest;
use App\Modules\Training\Infrastructure\Models\ProgramLevel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CohortController extends Controller
{
    public function index(): JsonResponse
    {
        $cohorts = Cohort::withTrashed()
            ->with(['programLevel.program', 'scheduleDays', 'facilitators:id,name,email'])
            ->withCount(['enrollments as occupied_seats' => fn ($query) => $query->whereIn('status', ['pending', 'active', 'ongoing'])])
            ->latest()
            ->get();

        return response()->json(['success' => true, 'data' => $cohorts]);
    }

    public function options(): JsonResponse
    {
        $levels = ProgramLevel::query()
            ->where('fee_status', 'approved')
            ->whereHas('program', fn ($query) => $query->where('status', 'approved'))
            ->with('program:id,name')
            ->get(['id', 'program_id', 'name', 'fee_tzs']);

        return response()->json(['success' => true, 'data' => $levels]);
    }

    public function store(StoreCohortRequest $request, CohortSchedulingService $service): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $service->create($request->validated(), $request->user()),
        ], 201);
    }

    public function update(StoreCohortRequest $request, Cohort $cohort, CohortSchedulingService $service): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $service->update($cohort, $request->validated(), $request->user()),
        ]);
    }

    public function destroy(Request $request, Cohort $cohort, CohortSchedulingService $service): JsonResponse
    {
        $service->deactivate($cohort, $request->user());

        return response()->json(['success' => true, 'message' => 'Cohort deactivated.']);
    }
}
