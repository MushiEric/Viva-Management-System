<?php

namespace App\Modules\Training\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Training\Application\LearningMaterialService;
use App\Modules\Training\Http\Requests\StoreLearningMaterialRequest;
use App\Modules\Training\Infrastructure\Models\LearningMaterial;
use App\Modules\Training\Infrastructure\Models\Program;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class LearningMaterialController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $materials = LearningMaterial::with(['program:id,name', 'uploader:id,name'])
            ->when($request->integer('program_id'), fn ($query, int $programId) => $query->where('program_id', $programId))
            ->latest()
            ->get();

        return response()->json(['success' => true, 'data' => $materials]);
    }

    public function store(
        StoreLearningMaterialRequest $request,
        Program $program,
        LearningMaterialService $service,
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'data' => $service->create($program, $request->validated(), $request->file('file'), $request->user()),
        ], 201);
    }

    public function update(
        StoreLearningMaterialRequest $request,
        LearningMaterial $material,
        LearningMaterialService $service,
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'data' => $service->update($material, $request->validated(), $request->file('file'), $request->user()),
        ]);
    }

    public function download(LearningMaterial $material): StreamedResponse
    {
        abort_unless($material->material_type === 'file' && $material->file_path, 404);
        abort_unless(Storage::disk('local')->exists($material->file_path), 404);

        return Storage::disk('local')->download($material->file_path, $material->title.'.'.pathinfo($material->file_path, PATHINFO_EXTENSION));
    }

    public function destroy(Request $request, LearningMaterial $material, LearningMaterialService $service): JsonResponse
    {
        $service->deactivate($material, $request->user());

        return response()->json(['success' => true, 'message' => 'Learning material deactivated.']);
    }
}
