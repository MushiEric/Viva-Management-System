<?php

namespace App\Providers;

use App\Modules\Certification\Listeners\IssueCertificateOnCompletion;
use App\Modules\Communication\Domain\Events\ClassReminderDue;
use App\Modules\Communication\Domain\Events\ContactInquirySubmitted;
use App\Modules\Communication\Listeners\NotifyFacilitatorsOfCohortSchedule;
use App\Modules\Communication\Listeners\NotifyManagersOfProgramSubmission;
use App\Modules\Communication\Listeners\NotifyProgramCreatorOfApproval;
use App\Modules\Communication\Listeners\NotifyProgramCreatorOfChanges;
use App\Modules\Communication\Listeners\SendClassReminderEmail;
use App\Modules\Communication\Listeners\SendContactInquiryEmails;
use App\Modules\Communication\Listeners\SendDiscountApprovalEmail;
use App\Modules\Communication\Listeners\SendEnrollmentConfirmation;
use App\Modules\Communication\Listeners\SendInvoiceEmail;
use App\Modules\Communication\Listeners\SendPaymentConfirmation;
use App\Modules\Communication\Listeners\SendStaffApprovalEmail;
use App\Modules\Enrollment\Domain\Events\TraineeEnrolled;
use App\Modules\Finance\Domain\Events\DiscountApproved;
use App\Modules\Finance\Domain\Events\InvoiceIssued;
use App\Modules\Finance\Domain\Events\PaymentRecorded;
use App\Modules\Identity\Domain\Events\StaffAccountApproved;
use App\Modules\Learning\Domain\Events\EnrollmentCompleted;
use App\Modules\Training\Domain\Events\CohortScheduled;
use App\Modules\Training\Domain\Events\ProgramApproved;
use App\Modules\Training\Domain\Events\ProgramChangesRequested;
use App\Modules\Training\Domain\Events\ProgramSubmittedForApproval;
use App\Shared\Application\EventBus;
use App\Shared\Infrastructure\LaravelEventBus;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(EventBus::class, LaravelEventBus::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)->by(strtolower((string) $request->input('email')).'|'.$request->ip());
        });

        Event::listen(TraineeEnrolled::class, SendEnrollmentConfirmation::class);
        Event::listen(PaymentRecorded::class, SendPaymentConfirmation::class);
        Event::listen(EnrollmentCompleted::class, IssueCertificateOnCompletion::class);
        Event::listen(StaffAccountApproved::class, SendStaffApprovalEmail::class);
        Event::listen(ProgramSubmittedForApproval::class, NotifyManagersOfProgramSubmission::class);
        Event::listen(ProgramApproved::class, NotifyProgramCreatorOfApproval::class);
        Event::listen(ProgramChangesRequested::class, NotifyProgramCreatorOfChanges::class);
        Event::listen(CohortScheduled::class, NotifyFacilitatorsOfCohortSchedule::class);
        Event::listen(InvoiceIssued::class, SendInvoiceEmail::class);
        Event::listen(DiscountApproved::class, SendDiscountApprovalEmail::class);
        Event::listen(ClassReminderDue::class, SendClassReminderEmail::class);
        Event::listen(ContactInquirySubmitted::class, SendContactInquiryEmails::class);
    }
}
