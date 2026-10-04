<?php

namespace App\Modules\Communication\Listeners;

use App\Modules\Communication\Infrastructure\Sms\BeemSmsClient;
use App\Modules\Enrollment\Domain\Events\TraineeSelfRegistered;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Throwable;

final class SendSelfRegistrationSms implements ShouldQueueAfterCommit
{
    use InteractsWithQueue;

    public function __construct(private readonly BeemSmsClient $sms) {}

    public function handle(TraineeSelfRegistered $event): void
    {
        $trainee = $event->enrollment->trainee;
        $cohort = $event->enrollment->cohort;
        $firstName = strtok($trainee->full_name, ' ');

        try {
            $this->sms->send(
                $trainee->phone,
                "Hello {$firstName}, you are registered at VIVA Digital Center for {$cohort->name}. "
                ."Your trainee number is {$trainee->trainee_number}. We will contact you with class and payment details.",
            );
        } catch (Throwable $e) {
            Log::error('Failed to send self-registration SMS: '.$e->getMessage());
        }
    }
}
