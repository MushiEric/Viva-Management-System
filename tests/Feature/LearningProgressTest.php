<?php

namespace Tests\Feature;

use App\Models\Cohort;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use App\Modules\Learning\Domain\Events\EnrollmentCompleted;
use App\Modules\Learning\Domain\Events\EnrollmentProgressUpdated;
use App\Modules\Learning\Domain\Events\LearningRecordAdded;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LearningProgressTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $facilitator;
    private Enrollment $enrollment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = $this->staff('Admin', 'admin');
        $this->facilitator = $this->staff('Facilitator', 'facilitator');
        $trainee = Trainee::create([
            'trainee_number' => 'VDC-2026-000001',
            'full_name' => 'Neema Student',
            'date_of_birth' => '2000-01-01',
            'gender' => 'female',
        ]);
        $course = Course::create(['name' => 'Digital Literacy']);
        $cohort = Cohort::create([
            'course_id' => $course->id,
            'name' => 'Digital Literacy August',
            'schedule_window' => 'morning',
            'max_seats' => 7,
            'is_active' => true,
        ]);
        $this->enrollment = Enrollment::create([
            'trainee_id' => $trainee->id,
            'cohort_id' => $cohort->id,
            'status' => 'ongoing',
            'progress_percentage' => 20,
            'enrolled_at' => now(),
            'created_by' => $this->admin->id,
        ]);
    }

    public function test_facilitator_records_assessment_practical_work_note_and_attendance(): void
    {
        Event::fake();
        Sanctum::actingAs($this->facilitator);

        $this->postJson("/api/v1/learning/enrollments/{$this->enrollment->id}/assessments", [
            'title' => 'Computer Basics',
            'percentage' => 84,
            'feedback' => 'Good practical understanding.',
        ])->assertCreated();

        $this->postJson("/api/v1/learning/enrollments/{$this->enrollment->id}/practical-work", [
            'title' => 'Create and save a document',
            'outcome' => 'Completed independently.',
            'percentage' => 90,
        ])->assertCreated();

        $this->postJson("/api/v1/learning/enrollments/{$this->enrollment->id}/notes", [
            'note' => 'Needs more practice with keyboard shortcuts.',
        ])->assertCreated();

        $this->postJson("/api/v1/learning/enrollments/{$this->enrollment->id}/attendance", [
            'session_date' => '2026-08-03',
            'status' => 'present',
        ])->assertCreated();

        $this->assertDatabaseHas('assessments', ['enrollment_id' => $this->enrollment->id, 'percentage' => 84]);
        $this->assertDatabaseHas('practical_works', ['enrollment_id' => $this->enrollment->id, 'percentage' => 90]);
        $this->assertDatabaseHas('enrollment_notes', ['enrollment_id' => $this->enrollment->id]);
        $this->assertDatabaseHas('attendance_records', ['enrollment_id' => $this->enrollment->id, 'status' => 'present']);
        Event::assertDispatchedTimes(LearningRecordAdded::class, 4);
    }

    public function test_attendance_for_same_date_is_updated_not_duplicated(): void
    {
        Sanctum::actingAs($this->facilitator);
        $url = "/api/v1/learning/enrollments/{$this->enrollment->id}/attendance";

        $this->postJson($url, ['session_date' => '2026-08-03', 'status' => 'absent'])->assertCreated();
        $this->postJson($url, ['session_date' => '2026-08-03', 'status' => 'excused'])->assertCreated();

        $this->assertDatabaseCount('attendance_records', 1);
        $this->assertDatabaseHas('attendance_records', ['status' => 'excused']);
    }

    public function test_facilitator_updates_progress_but_cannot_complete(): void
    {
        Event::fake();
        Sanctum::actingAs($this->facilitator);

        $this->patchJson("/api/v1/learning/enrollments/{$this->enrollment->id}/progress", [
            'percentage' => 65,
            'status' => 'ongoing',
        ])->assertOk()->assertJsonPath('data.progress_percentage', '65.00');

        Event::assertDispatched(EnrollmentProgressUpdated::class);
        $this->postJson("/api/v1/learning/enrollments/{$this->enrollment->id}/complete")->assertForbidden();
    }

    public function test_admin_completion_sets_full_progress_and_dispatches_certificate_event(): void
    {
        Event::fake();
        Sanctum::actingAs($this->admin);

        $this->postJson("/api/v1/learning/enrollments/{$this->enrollment->id}/complete")
            ->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.progress_percentage', '100.00');

        $this->assertDatabaseHas('enrollments', [
            'id' => $this->enrollment->id,
            'status' => 'completed',
            'progress_percentage' => 100,
        ]);
        Event::assertDispatched(EnrollmentCompleted::class);
    }

    public function test_closed_enrollment_rejects_new_learning_records(): void
    {
        $this->enrollment->update(['status' => 'transferred']);
        Sanctum::actingAs($this->facilitator);

        $this->postJson("/api/v1/learning/enrollments/{$this->enrollment->id}/notes", [
            'note' => 'Should not be accepted.',
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'Learning records cannot be added to a closed enrollment.');
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
