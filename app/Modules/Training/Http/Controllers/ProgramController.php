<?php

namespace App\Modules\Training\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Training\Application\ProgramManagementService;
use App\Modules\Training\Application\ProgramWorkflow;
use App\Modules\Training\Http\Requests\StoreProgramLevelRequest;
use App\Modules\Training\Http\Requests\StoreProgramRequest;
use App\Modules\Training\Infrastructure\Models\Program;
use App\Modules\Training\Infrastructure\Models\ProgramLevel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

final class ProgramController extends Controller
{
    public function index(): JsonResponse
    {
        $programs = Program::with([
            'creator:id,name',
            'levels.prerequisites:id,program_id,name',
            'levels.facilitators:id,name,email',
        ])->latest()->get();

        return response()->json(['success' => true, 'data' => $programs]);
    }

    public function facilitators(): JsonResponse
    {
        $facilitators = User::query()
            ->where('role', 'facilitator')
            ->where('status', 'approved')
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return response()->json(['success' => true, 'data' => $facilitators]);
    }

    public function image(Program $program): BinaryFileResponse
    {
        abort_unless(
            $program->image_path && Storage::disk('public')->exists($program->image_path),
            404,
        );

        return response()->file(Storage::disk('public')->path($program->image_path));
    }

    public function store(StoreProgramRequest $request, ProgramManagementService $service): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $service->create($request->validated(), $request->user()),
        ], 201);
    }

    public function update(StoreProgramRequest $request, Program $program, ProgramManagementService $service): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $service->update($program, $request->validated(), $request->user()),
        ]);
    }

    public function addLevel(
        StoreProgramLevelRequest $request,
        Program $program,
        ProgramManagementService $service,
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'data' => $service->addLevel($program, $request->validated(), $request->user()),
        ], 201);
    }

    public function updateLevel(
        StoreProgramLevelRequest $request,
        ProgramLevel $level,
        ProgramManagementService $service,
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'data' => $service->updateLevel($level, $request->validated(), $request->user()),
        ]);
    }

    public function submit(Request $request, Program $program, ProgramWorkflow $workflow): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $workflow->submit($program, $request->user())]);
    }

    public function approve(Request $request, Program $program, ProgramWorkflow $workflow): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $workflow->approve($program, $request->user())]);
    }

    public function requestChanges(Request $request, Program $program, ProgramWorkflow $workflow): JsonResponse
    {
        $validated = $request->validate(['notes' => ['required', 'string', 'max:5000']]);

        return response()->json([
            'success' => true,
            'data' => $workflow->requestChanges($program, $request->user(), $validated['notes']),
        ]);
    }

    public function approveFee(Request $request, ProgramLevel $level, ProgramManagementService $service): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $service->approveFee($level, $request->user()),
        ]);
    }

    public function destroy(Request $request, Program $program, ProgramManagementService $service): JsonResponse
    {
        $service->deactivate($program, $request->user());

        return response()->json(['success' => true, 'message' => 'Program deactivated.']);
    }
}
