<?php

namespace App\Modules\Communication\Console\Commands;

use App\Modules\Communication\Application\ClassReminderService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class SendClassReminders extends Command
{
    protected $signature = 'training:send-class-reminders {--date= : Session date in YYYY-MM-DD; defaults to tomorrow}';

    protected $description = 'Queue email reminders one day before scheduled training sessions';

    public function handle(ClassReminderService $service): int
    {
        $sessionDate = $this->option('date')
            ? CarbonImmutable::parse($this->option('date'))->startOfDay()
            : CarbonImmutable::tomorrow();
        $queued = $service->queueForDate($sessionDate);

        $this->info("Queued {$queued} class reminder(s) for {$sessionDate->toDateString()}.");

        return self::SUCCESS;
    }
}
