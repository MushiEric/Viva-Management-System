<?php

namespace Tests\Feature;

use App\Models\Cohort;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use App\Modules\Enrollment\Domain\Events\TraineeEnrolled;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EnrollmentTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected Cohort $cohort;

    protected function setUp(): void
    {
        parent::setUp();

        // Create an admin
        $this->admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@viva.co.tz',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'approved',
            'approved_at' => now(),
        ]);

        // Create a course
        $course = Course::create([
            'name' => 'Web Development',
            'parent_id' => null,
        ]);

        // Create a cohort with capacity of 7
        $this->cohort = Cohort::create([
            'course_id' => $course->id,
            'name' => 'Web Cohort A',
            'schedule_window' => 'morning',
            'max_seats' => 7,
            'is_active' => true,
        ]);
    }

    /**
     * Test public timetable web route.
     */
    public function test_public_timetable_web_view_loads_successfully()
    {
        $response = $this->get('/timetable');

        $response->assertStatus(200);
        $response->assertSee('Web Development');
        $response->assertSee('Web Cohort A');
    }

    /**
     * Test public API timetable endpoint.
     */
    public function test_public_api_timetable_endpoint()
    {
        $response = $this->getJson('/api/v1/timetable');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'cohort_id',
                    'cohort_name',
                    'cohort' => ['id', 'name', 'display_name'],
                    'program' => ['id', 'name'],
                    'level' => ['id', 'name', 'description', 'syllabus_outline', 'fee_tzs'],
                    'schedule_window',
                    'course' => ['id', 'name', 'is_module', 'parent_course'],
                    'capacity' => ['max_seats', 'occupied_seats', 'available_seats', 'status'],
                ],
            ],
        ]);
        $response->assertJsonPath('data.0.cohort.display_name', 'Web Development')
            ->assertJsonPath('data.0.program.name', 'Web Development')
            ->assertJsonPath('data.0.level.name', null);
    }

    /**
     * Test Sanctum token issuance.
     */
    public function test_api_token_issuance_with_valid_credentials()
    {
        $response = $this->postJson('/api/v1/token', [
            'email' => 'admin@viva.co.tz',
            'password' => 'password',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure(['success', 'token', 'user']);
    }

    /**
     * Test standard student enrollment success.
     */
    public function test_trainee_can_be_enrolled_successfully()
    {
        Event::fake();

        Sanctum::actingAs($this->admin);

        $trainee = Trainee::create([
            'trainee_number' => 'VDC-2026-000001',
            'full_name' => 'Alice Student',
            'date_of_birth' => '2000-01-01',
            'gender' => 'female',
        ]);

        $response = $this->postJson('/api/v1/staff/enrollments', [
            'cohort_id' => $this->cohort->id,
            'trainee_id' => $trainee->id,
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('success', true);

        // Verify in DB
        $this->assertDatabaseHas('enrollments', [
            'cohort_id' => $this->cohort->id,
            'trainee_id' => $trainee->id,
        ]);

        Event::assertDispatched(TraineeEnrolled::class);
    }

    /**
     * Test minor registration requires emergency contact.
     */
    public function test_minor_requires_emergency_contact()
    {
        Event::fake();

        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/trainees', [
            'full_name' => 'Junior Kid',
            'date_of_birth' => now()->subYears(12)->toDateString(),
            'gender' => 'male',
            'phone' => '0712345678',
            'address' => 'Kigamboni, Dar es Salaam',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'Emergency contact information is required for a minor.');
    }

    /**
     * Test transactional capacity check rejects registration when cohort is full.
     */
    public function test_enrollment_fails_when_lab_is_at_maximum_capacity()
    {
        // Populate cohort to full capacity (7 seats)
        for ($i = 1; $i <= 7; $i++) {
            $trainee = Trainee::create([
                'trainee_number' => "VDC-2026-00000{$i}",
                'full_name' => "Student {$i}",
                'date_of_birth' => '2000-01-01',
                'gender' => 'male',
            ]);
            Enrollment::create([
                'trainee_id' => $trainee->id,
                'cohort_id' => $this->cohort->id,
                'status' => 'active',
                'enrolled_at' => now(),
            ]);
        }

        $this->assertEquals(7, Enrollment::where('cohort_id', $this->cohort->id)->count());

        // Now attempt 8th enrollment
        Sanctum::actingAs($this->admin);

        $extra = Trainee::create([
            'trainee_number' => 'VDC-2026-000008',
            'full_name' => 'Extra Student',
            'date_of_birth' => '2000-01-01',
            'gender' => 'female',
        ]);

        $response = $this->postJson('/api/v1/staff/enrollments', [
            'cohort_id' => $this->cohort->id,
            'trainee_id' => $extra->id,
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
            'message' => 'Lab at maximum capacity (7/7 stations occupied) for this session.',
        ]);
    }

    /**
     * Test register endpoint.
     */
    public function test_admin_can_register_adult_trainee_without_email()
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/trainees', [
            'full_name' => 'Bob Builder',
            'date_of_birth' => '1995-03-10',
            'gender' => 'male',
            'phone' => '0712345678',
            'address' => 'Kigamboni, Dar es Salaam',
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure(['success', 'data']);
        $this->assertDatabaseHas('trainees', [
            'full_name' => 'Bob Builder',
            'phone' => '0712345678',
            'email' => null,
            'address' => 'Kigamboni, Dar es Salaam',
        ]);
    }
}
