<?php

namespace App\Listeners;

use App\Events\StudentRegistered;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class QueueSmsNotification implements ShouldQueueAfterCommit
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(StudentRegistered $event): void
    {
        $student = $event->student;
        $cohort = $event->cohort;

        $phone = null;
        $smsName = $student->name;

        if ($student->role === 'minor') {
            $manager = $student->manager;
            if ($manager && $manager->phone) {
                $phone = $manager->phone;
                $smsName = "Parent/Admin ({$manager->name}) of Minor {$student->name}";
            }
        } else {
            $phone = $student->phone;
        }

        if (!$phone) {
            Log::info("SMS notification skipped: No phone number registered for {$smsName}.");
            return;
        }

        $message = "Habari! {$student->name} amefanikiwa kujiandikisha katika kozi ya {$cohort->course->name} - Viva Digital Center, Dar es Salaam.";

        Log::info("Queuing SMS Notification...", [
            'to' => $phone,
            'message' => $message,
            'recipient_type' => $student->role,
        ]);

        // Pre-configured hooks for popular local Tanzanian SMS gateways (e.g., Beem, NextSMS)
        // -------------------------------------------------------------
        // Example integration for Beem SMS (https://beem.africa/):
        // 
        // $api_key = config('services.beem.key');
        // $secret_key = config('services.beem.secret');
        // 
        // $response = Http::withBasicAuth($api_key, $secret_key)
        //     ->post('https://api.beem.africa/v1/send', [
        //         'source_addr' => 'INFO',
        //         'schedule_time' => '',
        //         'message' => $message,
        //         'recipients' => [
        //             [
        //                 'recipient_id' => 1,
        //                 'dest_addr' => $phone // Format: 2557XXXXXXXX
        //             ]
        //         ]
        //     ]);
        // -------------------------------------------------------------
    }
}
