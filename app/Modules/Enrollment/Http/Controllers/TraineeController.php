<?php

namespace App\Modules\Enrollment\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Enrollment\Application\TraineeRegistrationService;
use App\Modules\Enrollment\Http\Requests\StoreTraineeRequest;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Modules\Identity\Application\AuthorizationService;
use App\Modules\Identity\Domain\Permission;

final class TraineeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $trainees = Trainee::query()
            ->with('emergencyContact')
            ->withCount('enrollments')
            ->when($request->string('search')->toString(), function ($query, string $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('trainee_number', 'like', "%{$search}%")
                        ->orWhere('full_name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($request->string('gender')->toString(), fn ($query, string $gender) => $query->where('gender', $gender))
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json(['success' => true, 'data' => $trainees]);
    }

    public function show(
        Request $request,
        Trainee $trainee,
        AuthorizationService $authorization,
    ): JsonResponse
    {
        $trainee->load([
            'emergencyContact',
            'enrollments' => fn ($query) => $query->latest('enrolled_at'),
            'enrollments.cohort.programLevel.program',
            'enrollments.cohort.scheduleDays',
        ]);
        $trainee->loadCount('enrollments');

        $canViewFinance = $authorization->allows($request->user(), Permission::ViewFinance);
        $invoices = $canViewFinance
            ? \App\Modules\Finance\Infrastructure\Models\Invoice::query()
                ->where('trainee_id', $trainee->id)
                ->with('items')
                ->latest()
                ->get()
            : null;
        $payments = $canViewFinance
            ? \App\Modules\Finance\Infrastructure\Models\Payment::query()
                ->where('trainee_id', $trainee->id)
                ->with('allocations')
                ->latest()
                ->get()
            : null;

        return response()->json([
            'success' => true,
            'data' => [
                'trainee' => $trainee,
                'invoices' => $invoices,
                'payments' => $payments,
            ],
        ]);
    }

    public function store(StoreTraineeRequest $request, TraineeRegistrationService $service): JsonResponse
    {
        $trainee = $service->register($request->validated(), $request->user());

        return response()->json(['success' => true, 'data' => $trainee], 201);
    }

    public function update(
        StoreTraineeRequest $request,
        Trainee $trainee,
        TraineeRegistrationService $service,
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'data' => $service->update($trainee, $request->validated(), $request->user()),
        ]);
    }

    public function destroy(Request $request, Trainee $trainee, TraineeRegistrationService $service): JsonResponse
    {
        $service->deactivate($trainee, $request->user());

        return response()->json(['success' => true, 'message' => 'Trainee record deactivated.']);
    }
}
