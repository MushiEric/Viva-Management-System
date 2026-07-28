<?php

namespace App\Modules\Enrollment\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Enrollment\Application\TraineeRegistrationService;
use App\Modules\Enrollment\Http\Requests\StoreTraineeRequest;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class TraineeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $trainees = Trainee::query()
            ->with('emergencyContact')
            ->withCount('enrollments')
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json(['success' => true, 'data' => $trainees]);
    }

    public function store(StoreTraineeRequest $request, TraineeRegistrationService $service): JsonResponse
    {
        $trainee = $service->register($request->validated(), $request->user());

        return response()->json(['success' => true, 'data' => $trainee], 201);
    }
}
