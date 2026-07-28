<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Training\Infrastructure\Models\Program;
use App\Modules\Training\Infrastructure\Models\ProgramLevel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CohortSchedulingTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;
    private User $admin;
    private User $facilitator;
    private ProgramLevel $level;

    protected function setUp(): void
    {
        parent::setUp();

        $this->manager = $this->staff('Manager', 'manager');
        $this->admin = $this->staff('Admin', 'admin');
        $this->facilitator = $this->staff('Facilitator', 'facilitator');

        $program = Program::create([
            'name' => 'Python Programming',
            'status' => 'approved',
            'created_by' => $this->facilitator->id,
            'approved_by' => $this->manager->id,
            'approved_at' => now(),
        ]);
        $this->level = ProgramLevel::create([
            'program_id' => $program->id,
            'name' => 'Beginner',
            'duration_weeks' => 4,
            'training_days_per_week' => 6,
            'fee_tzs' => 250000,
            'fee_status' => 'approved',
            'fee_approved_by' => $this->manager->id,
            'fee_approved_at' => now(),
        ]);
    }

    public function test_admin_creates_cohort_with_default_morning_times(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/cohorts', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.max_seats', 7)
            ->assertJsonPath('data.default_start_time', '08:30')
            ->assertJsonPath('data.default_end_time', '10:30');

        $cohortId = $response->json('data.id');
        $this->assertDatabaseCount('cohort_schedule_days', 6);
        $this->assertDatabaseHas('cohort_facilitators', [
            'cohort_id' => $cohortId,
            'user_id' => $this->facilitator->id,
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'cohort.created']);
    }

    public function test_sunday_schedule_is_rejected(): void
    {
        Sanctum::actingAs($this->admin);
        $payload = $this->payload();
        $payload['schedule_days'] = [['day_of_week' => 7]];

        $this->postJson('/api/v1/cohorts', $payload)->assertUnprocessable();
    }

    public function test_unapproved_fee_cannot_be_scheduled(): void
    {
        $this->level->update(['fee_status' => 'pending_approval']);
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/cohorts', $this->payload())
            ->assertUnprocessable()
            ->assertJsonPath('message', 'The program level fee must be approved before scheduling.');
    }

    public function test_schedule_overlap_is_allowed(): void
    {
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/v1/cohorts', $this->payload('Python A'))->assertCreated();
        $this->postJson('/api/v1/cohorts', $this->payload('Python B'))->assertCreated();

        $this->assertDatabaseCount('cohorts', 2);
    }

    public function test_public_timetable_contains_dates_times_fee_and_days(): void
    {
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/v1/cohorts', $this->payload())->assertCreated();

        $this->getJson('/api/v1/timetable')
            ->assertOk()
            ->assertJsonPath('data.0.course.parent_course', 'Python Programming')
            ->assertJsonPath('data.0.course.fee_tzs', '250000.00')
            ->assertJsonPath('data.0.schedule_days.0.day_name', 'Monday')
            ->assertJsonPath('data.0.capacity.max_seats', 7);
    }

    public function test_facilitator_cannot_manage_cohorts_by_default(): void
    {
        Sanctum::actingAs($this->facilitator);
        $this->postJson('/api/v1/cohorts', $this->payload())->assertForbidden();
    }

    private function payload(string $name = 'Python August Morning'): array
    {
        return [
            'program_level_id' => $this->level->id,
            'name' => $name,
            'schedule_window' => 'morning',
            'start_date' => '2026-08-03',
            'end_date' => '2026-08-29',
            'facilitator_ids' => [$this->facilitator->id],
            'schedule_days' => array_map(
                fn (int $day) => ['day_of_week' => $day],
                range(1, 6),
            ),
        ];
    }

    private function staff(string $name, string $role): User
    {
        return User::create([
            'name' => $name,
            'email' => strtolower($name).'@example.com',
            'password' => bcrypt('password123'),
            'role' => $role,
            'status' => 'approved',
            'approved_at' => now(),
        ]);
    }
}
