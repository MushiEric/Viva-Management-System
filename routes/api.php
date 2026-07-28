<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TimetableController;
use App\Modules\Enrollment\Http\Controllers\TraineeController;
use App\Modules\Enrollment\Http\Controllers\EnrollmentController as StaffEnrollmentController;
use App\Modules\Identity\Http\Controllers\StaffController;
use App\Modules\Training\Http\Controllers\ProgramController;
use App\Modules\Training\Http\Controllers\CohortController;

Route::prefix('v1')->group(function () {
    // Authentication token endpoint
    Route::post('/token', [AuthController::class, 'issueToken']);
    // Public API endpoints
    Route::get('/timetable', [TimetableController::class, 'index']);

    // Sanctum protected API endpoints
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/user', function (Request $request) {
            return $request->user();
        });
        Route::middleware('permission:trainees.view')->get('/trainees', [TraineeController::class, 'index']);
        Route::middleware('permission:trainees.manage')->post('/trainees', [TraineeController::class, 'store']);
        Route::middleware('permission:enrollments.manage')->post('/staff/enrollments', [StaffEnrollmentController::class, 'store']);
        Route::middleware('permission:enrollments.transfer')->post('/staff/enrollments/{enrollment}/transfer', [StaffEnrollmentController::class, 'transfer']);

        Route::middleware('permission:staff.manage')->group(function () {
            Route::get('/staff', [StaffController::class, 'index']);
            Route::post('/staff', [StaffController::class, 'store']);
            Route::put('/staff/{staff}', [StaffController::class, 'update']);
            Route::delete('/staff/{staff}', [StaffController::class, 'destroy']);
        });
        Route::middleware('permission:staff.approve')->post('/staff/{staff}/approve', [StaffController::class, 'approve']);
        Route::middleware('permission:permissions.manage')->group(function () {
            Route::get('/staff-permissions', [StaffController::class, 'permissions']);
            Route::put('/staff/{staff}/permissions', [StaffController::class, 'updatePermissions']);
        });

        Route::middleware('permission:programs.view')->group(function () {
            Route::get('/programs', [ProgramController::class, 'index']);
            Route::get('/program-facilitators', [ProgramController::class, 'facilitators']);
        });
        Route::middleware('permission:programs.draft')->group(function () {
            Route::post('/programs', [ProgramController::class, 'store']);
            Route::put('/programs/{program}', [ProgramController::class, 'update']);
            Route::post('/programs/{program}/levels', [ProgramController::class, 'addLevel']);
            Route::put('/program-levels/{level}', [ProgramController::class, 'updateLevel']);
            Route::post('/programs/{program}/submit', [ProgramController::class, 'submit']);
            Route::delete('/programs/{program}', [ProgramController::class, 'destroy']);
        });
        Route::middleware('permission:programs.approve')->group(function () {
            Route::post('/programs/{program}/approve', [ProgramController::class, 'approve']);
            Route::post('/programs/{program}/request-changes', [ProgramController::class, 'requestChanges']);
        });
        Route::middleware('permission:fees.approve')->post('/program-levels/{level}/approve-fee', [ProgramController::class, 'approveFee']);

        Route::middleware('permission:cohorts.manage')->group(function () {
            Route::get('/cohorts', [CohortController::class, 'index']);
            Route::get('/cohort-options', [CohortController::class, 'options']);
            Route::post('/cohorts', [CohortController::class, 'store']);
            Route::put('/cohorts/{cohort}', [CohortController::class, 'update']);
            Route::delete('/cohorts/{cohort}', [CohortController::class, 'destroy']);
        });
    });
});
