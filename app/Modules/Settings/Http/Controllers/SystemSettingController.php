<?php

namespace App\Modules\Settings\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Audit\Application\AuditLogger;
use App\Modules\Settings\Http\Requests\UpdateSystemSettingRequest;
use App\Modules\Settings\Infrastructure\Models\SystemSetting;
use Illuminate\Http\JsonResponse;

final class SystemSettingController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => SystemSetting::current(),
        ]);
    }

    public function update(UpdateSystemSettingRequest $request, AuditLogger $audit): JsonResponse
    {
        $settings = SystemSetting::current();
        $before = $settings->toArray();
        $settings->update($request->validated());
        $audit->record($request->user(), 'settings.updated', $settings, $before, $settings->fresh()->toArray());

        return response()->json([
            'success' => true,
            'message' => 'System settings updated.',
            'data' => $settings->fresh(),
        ]);
    }
}
