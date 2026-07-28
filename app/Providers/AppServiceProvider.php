<?php

namespace App\Providers;

use App\Shared\Application\EventBus;
use App\Shared\Infrastructure\LaravelEventBus;
use App\Modules\Certification\Listeners\IssueCertificateOnCompletion;
use App\Modules\Communication\Listeners\SendEnrollmentConfirmation;
use App\Modules\Communication\Listeners\SendPaymentConfirmation;
use App\Modules\Enrollment\Domain\Events\TraineeEnrolled;
use App\Modules\Finance\Domain\Events\PaymentRecorded;
use App\Modules\Learning\Domain\Events\EnrollmentCompleted;
use Illuminate\Support\Facades\Event;
use App\Modules\Communication\Listeners\SendStaffApprovalEmail;
use App\Modules\Identity\Domain\Events\StaffAccountApproved;
use App\Modules\Communication\Listeners\NotifyManagersOfProgramSubmission;
use App\Modules\Communication\Listeners\NotifyProgramCreatorOfApproval;
use App\Modules\Communication\Listeners\NotifyProgramCreatorOfChanges;
use App\Modules\Training\Domain\Events\ProgramApproved;
use App\Modules\Training\Domain\Events\ProgramChangesRequested;
use App\Modules\Training\Domain\Events\ProgramSubmittedForApproval;
use App\Modules\Communication\Listeners\NotifyFacilitatorsOfCohortSchedule;
use App\Modules\Training\Domain\Events\CohortScheduled;
use App\Modules\Communication\Listeners\SendInvoiceEmail;
use App\Modules\Communication\Listeners\SendDiscountApprovalEmail;
use App\Modules\Finance\Domain\Events\InvoiceIssued;
use App\Modules\Finance\Domain\Events\DiscountApproved;
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
    }
}
