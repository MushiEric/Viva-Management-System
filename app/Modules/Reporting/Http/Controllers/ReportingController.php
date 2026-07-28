<?php

namespace App\Modules\Reporting\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Reporting\Application\ReportingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class ReportingController extends Controller
{
    public function dashboard(Request $request, ReportingService $service): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $service->dashboard($request->user())]);
    }

    public function report(Request $request, ReportingService $service): JsonResponse
    {
        $validated = $request->validate([
            'period' => ['required', Rule::in(['daily', 'weekly', 'monthly', 'custom'])],
            'from' => ['required_if:period,custom', 'nullable', 'date'],
            'to' => ['required_if:period,custom', 'nullable', 'date', 'after_or_equal:from'],
        ]);

        return response()->json([
            'success' => true,
            'data' => $service->report(
                $validated['period'],
                $validated['from'] ?? null,
                $validated['to'] ?? null,
            ),
        ]);
    }
}
