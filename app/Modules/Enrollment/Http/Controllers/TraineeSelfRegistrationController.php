<?php

namespace App\Modules\Enrollment\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Enrollment\Application\TraineeSelfRegistrationService;
use App\Modules\Enrollment\Http\Requests\SelfRegisterTraineeRequest;
use Illuminate\Http\JsonResponse;

final class TraineeSelfRegistrationController extends Controller
{
    public function store(SelfRegisterTraineeRequest $request, TraineeSelfRegistrationService $service): JsonResponse
    {
        $trainee = $service->register($request->validated());

        // Public endpoint: return only what the registrant needs, not the full record.
        return response()->json([
            'success' => true,
            'message' => 'Registration received successfully.',
            'data' => [
                'trainee_number' => $trainee->trainee_number,
                'full_name' => $trainee->full_name,
                'course_name' => $trainee->requestedLevel->displayName(),
            ],
        ], 201);
    }
}
