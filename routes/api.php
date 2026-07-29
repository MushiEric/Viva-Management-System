<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TimetableController;
use App\Modules\Audit\Http\Controllers\AuditLogController;
use App\Modules\Certification\Http\Controllers\CertificateController;
use App\Modules\Communication\Http\Controllers\ContactInquiryController;
use App\Modules\Enrollment\Http\Controllers\EnrollmentController as StaffEnrollmentController;
use App\Modules\Enrollment\Http\Controllers\TraineeController;
use App\Modules\Finance\Http\Controllers\FinanceController;
use App\Modules\Identity\Http\Controllers\StaffController;
use App\Modules\Learning\Http\Controllers\LearningController;
use App\Modules\Reporting\Http\Controllers\ReportingController;
use App\Modules\Settings\Http\Controllers\SystemSettingController;
use App\Modules\Training\Http\Controllers\CohortController;
use App\Modules\Training\Http\Controllers\LearningMaterialController;
use App\Modules\Training\Http\Controllers\ProgramController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:api')->prefix('v1')->group(function () {
    // Authentication token endpoint
    Route::middleware('throttle:login')->post('/token', [AuthController::class, 'issueToken']);
    // Public API endpoints
    Route::get('/timetable', [TimetableController::class, 'index']);
    Route::post('/contact-inquiries', [ContactInquiryController::class, 'store']);

    // Sanctum protected API endpoints
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/user', function (Request $request) {
            return $request->user();
        });
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::put('/profile/password', [AuthController::class, 'changePassword']);
        Route::middleware('permission:trainees.view')->get('/trainees', [TraineeController::class, 'index']);
        Route::middleware('permission:trainees.view')->get('/trainees/{trainee}', [TraineeController::class, 'show']);
        Route::middleware('permission:trainees.view')->get('/trainees/{trainee}/registration-form', [TraineeController::class, 'downloadRegistrationForm']);
        Route::middleware('permission:trainees.manage')->group(function () {
            Route::post('/trainees', [TraineeController::class, 'store']);
            Route::put('/trainees/{trainee}', [TraineeController::class, 'update']);
            Route::delete('/trainees/{trainee}', [TraineeController::class, 'destroy']);
        });
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

        Route::middleware('permission:trainees.view')->group(function () {
            Route::get('/learning/enrollments', [LearningController::class, 'index']);
            Route::get('/learning/enrollments/{enrollment}', [LearningController::class, 'show']);
        });
        Route::middleware('permission:learning.record')->group(function () {
            Route::post('/learning/enrollments/{enrollment}/assessments', [LearningController::class, 'assessment']);
            Route::post('/learning/enrollments/{enrollment}/practical-work', [LearningController::class, 'practicalWork']);
            Route::post('/learning/enrollments/{enrollment}/notes', [LearningController::class, 'note']);
            Route::post('/learning/enrollments/{enrollment}/attendance', [LearningController::class, 'attendance']);
            Route::patch('/learning/enrollments/{enrollment}/progress', [LearningController::class, 'progress']);
        });
        Route::middleware('permission:enrollments.complete')->post('/learning/enrollments/{enrollment}/complete', [LearningController::class, 'complete']);

        Route::middleware('permission:finance.view')->get('/finance', [FinanceController::class, 'index']);
        Route::middleware('permission:finance.view')->get('/finance/invoices/{invoice}', [FinanceController::class, 'showInvoice']);
        Route::middleware('permission:finance.view')->get('/finance/invoices/{invoice}/pdf', [FinanceController::class, 'downloadInvoice']);
        Route::middleware('permission:finance.view')->get('/finance/payments/{payment}/pdf', [FinanceController::class, 'downloadReceipt']);
        Route::middleware('permission:finance.manage')->group(function () {
            Route::post('/finance/invoices', [FinanceController::class, 'createInvoice']);
            Route::post('/finance/invoices/{invoice}/issue', [FinanceController::class, 'issueInvoice']);
            Route::post('/finance/invoices/{invoice}/discounts', [FinanceController::class, 'requestDiscount']);
            Route::post('/finance/payments', [FinanceController::class, 'recordPayment']);
            Route::post('/finance/invoices/{invoice}/cancel', [FinanceController::class, 'cancelInvoice']);
        });
        Route::middleware('permission:discounts.approve')->post('/finance/discounts/{discount}/approve', [FinanceController::class, 'approveDiscount']);
        Route::middleware('permission:payments.cancel')->post('/finance/payments/{payment}/cancel', [FinanceController::class, 'cancelPayment']);

        Route::middleware('permission:certificates.issue')->group(function () {
            Route::get('/certificates', [CertificateController::class, 'index']);
            Route::post('/certificates/enrollments/{enrollment}', [CertificateController::class, 'issue']);
            Route::get('/certificates/{certificate}/download', [CertificateController::class, 'download']);
        });

        Route::middleware('permission:programs.view')->group(function () {
            Route::get('/learning-materials', [LearningMaterialController::class, 'index']);
            Route::get('/learning-materials/{material}/download', [LearningMaterialController::class, 'download']);
        });
        Route::middleware('permission:materials.manage')->group(function () {
            Route::post('/programs/{program}/learning-materials', [LearningMaterialController::class, 'store']);
            Route::post('/learning-materials/{material}', [LearningMaterialController::class, 'update']);
            Route::delete('/learning-materials/{material}', [LearningMaterialController::class, 'destroy']);
        });

        Route::get('/dashboard', [ReportingController::class, 'dashboard']);
        Route::middleware('permission:reports.view')->get('/reports', [ReportingController::class, 'report']);
        Route::middleware('permission:audit.view')->get('/audit-logs', [AuditLogController::class, 'index']);
        Route::middleware('permission:enquiries.view')->get('/contact-inquiries', [ContactInquiryController::class, 'index']);
        Route::middleware('permission:enquiries.manage')->patch('/contact-inquiries/{inquiry}', [ContactInquiryController::class, 'update']);
        Route::middleware('permission:settings.manage')->group(function () {
            Route::get('/settings', [SystemSettingController::class, 'show']);
            Route::put('/settings', [SystemSettingController::class, 'update']);
        });
    });
});
