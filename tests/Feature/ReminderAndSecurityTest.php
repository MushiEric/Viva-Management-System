<?php

namespace Tests\Feature;

use App\Models\Cohort;
use App\Models\Enrollment;
use App\Models\User;
use App\Modules\Communication\Domain\Events\ClassReminderDue;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use App\Modules\Training\Infrastructure\Models\CohortScheduleDay;
use App\Modules\Training\Infrastructure\Models\Program;
use App\Modules\Training\Infrastructure\Models\ProgramLevel;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class ReminderAndSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_command_queues_one_day_reminder_once_for_eligible_trainee(): void
    {
        CarbonImmutable::setTestNow('2026-07-27 08:30:00');
        $manager = $this->staff('manager@example.com');
        $program = Program::create([
            'name' => 'Python Programming',
            'status' => 'approved',
            'created_by' => $manager->id,
        ]);
        $level = ProgramLevel::create([
            'program_id' => $program->id,
            'name' => 'Beginner',
            'fee_tzs' => 250000,
            'fee_status' => 'approved',
        ]);
        $cohort = Cohort::create([
            'program_level_id' => $level->id,
            'name' => 'Python July',
            'schedule_window' => 'morning',
            'max_seats' => 7,
            'is_active' => true,
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-31',
            'default_start_time' => '08:30',
            'default_end_time' => '10:30',
        ]);
        CohortScheduleDay::create([
            'cohort_id' => $cohort->id,
            'day_of_week' => 2,
            'start_time' => '08:30',
            'end_time' => '10:30',
        ]);
        $withEmail = $this->trainee('VDC-2026-000001', 'email@example.com');
        $withoutEmail = $this->trainee('VDC-2026-000002', null);
        foreach ([$withEmail, $withoutEmail] as $trainee) {
            Enrollment::create([
                'trainee_id' => $trainee->id,
                'cohort_id' => $cohort->id,
                'status' => 'active',
                'enrolled_at' => now(),
                'created_by' => $manager->id,
            ]);
        }

        Event::fake();
        $this->artisan('training:send-class-reminders', ['--date' => '2026-07-28'])
            ->expectsOutput('Queued 1 class reminder(s) for 2026-07-28.')
            ->assertSuccessful();
        Event::assertDispatched(ClassReminderDue::class);
        $this->assertDatabaseCount('reminder_deliveries', 1);

        $this->artisan('training:send-class-reminders', ['--date' => '2026-07-28'])
            ->expectsOutput('Queued 0 class reminder(s) for 2026-07-28.')
            ->assertSuccessful();
        $this->assertDatabaseCount('reminder_deliveries', 1);
    }

    public function test_sunday_never_queues_reminders(): void
    {
        $this->artisan('training:send-class-reminders', ['--date' => '2026-08-02'])
            ->expectsOutput('Queued 0 class reminder(s) for 2026-08-02.')
            ->assertSuccessful();
    }

    public function test_login_is_rate_limited_after_five_attempts(): void
    {
        $user = $this->staff('limited@example.com');

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/v1/token', [
                'email' => $user->email,
                'password' => 'wrong-password',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/v1/token', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ])->assertTooManyRequests();
    }

    public function test_logout_revokes_current_access_token(): void
    {
        $user = $this->staff('logout@example.com');
        $token = $user->createToken('test-device');

        $this->withToken($token->plainTextToken)
            ->postJson('/api/v1/logout')
            ->assertOk();

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $token->accessToken->id]);
    }

    public function test_staff_creation_rejects_weak_password_and_responses_have_security_headers(): void
    {
        $manager = $this->staff('security@example.com');
        \Laravel\Sanctum\Sanctum::actingAs($manager);

        $this->postJson('/api/v1/staff', [
            'name' => 'Weak User',
            'email' => 'weak@example.com',
            'role' => 'facilitator',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertUnprocessable();

        $this->getJson('/api/v1/dashboard')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN');
    }

    private function staff(string $email): User
    {
        return User::create([
            'name' => 'Manager',
            'email' => $email,
            'password' => bcrypt('StrongPass123!'),
            'role' => 'manager',
            'status' => 'approved',
            'approved_at' => now(),
        ]);
    }

    private function trainee(string $number, ?string $email): Trainee
    {
        return Trainee::create([
            'trainee_number' => $number,
            'full_name' => $number,
            'date_of_birth' => '2000-01-01',
            'gender' => 'male',
            'email' => $email,
        ]);
    }
}
