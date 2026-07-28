<?php

namespace App\Modules\Certification\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Modules\Certification\Application\CertificateService;
use App\Modules\Certification\Infrastructure\Models\Certificate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class CertificateController extends Controller
{
    public function index(): JsonResponse
    {
        $certificates = Certificate::with([
            'enrollment.trainee:id,trainee_number,full_name',
            'enrollment.cohort.programLevel.program',
        ])->latest('issued_at')->get();

        return response()->json(['success' => true, 'data' => $certificates]);
    }

    public function issue(Request $request, Enrollment $enrollment, CertificateService $service): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $service->issue($enrollment, $request->user()),
        ], 201);
    }

    public function download(Certificate $certificate): StreamedResponse
    {
        abort_unless($certificate->file_path && Storage::disk('local')->exists($certificate->file_path), 404);

        return Storage::disk('local')->download(
            $certificate->file_path,
            "{$certificate->certificate_number}.pdf",
            ['Content-Type' => 'application/pdf'],
        );
    }
}
