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
        $trainee = $event->trainee;
        $course = $trainee->requestedLevel?->displayName() ?? 'your course';
        $firstName = strtok($trainee->full_name, ' ');

        try {
            $this->sms->send(
                $trainee->phone,
                "Hello {$firstName}, you are registered at VIVA Digital Center for {$course}. "
                ."Your trainee number is {$trainee->trainee_number}. We will contact you to agree your class schedule and payment.",
            );
        } catch (Throwable $e) {
            Log::error('Failed to send self-registration SMS: '.$e->getMessage());
        }
    }
}
