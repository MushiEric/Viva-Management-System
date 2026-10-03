<?php

namespace Tests\Feature;

use App\Models\Cohort;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use App\Modules\Communication\Notifications\PortalNotification;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TraineeSelfRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private Cohort $cohort;

    protected function setUp(): void
    {
        parent::setUp();

        $course = Course::create(['name' => 'Python']);
        $this->cohort = Cohort::create([
            'course_id' => $course->id,
            'name' => 'Python Morning',
            'schedule_window' => 'morning',
            'max_seats' => 2,
            'is_active' => true,
        ]);
    }

    public function test_guest_can_register_and_enroll_in_a_cohort(): void
    {
        $this->postJson('/api/v1/trainee-registrations', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.full_name', 'Juma Hamisi')
            ->assertJsonPath('data.cohort_name', 'Python Morning')
            ->assertJsonMissingPath('data.id')
            ->assertJsonMissingPath('data.phone');

        $trainee = Trainee::where('full_name', 'Juma Hamisi')->firstOrFail();
        $this->assertMatchesRegularExpression('/^VDC-\d{4}-\d{6}$/', $trainee->trainee_number);
        $this->assertNull($trainee->registration_form_path);
        $this->assertSame('self', $trainee->registration_source);
        $this->assertDatabaseHas('enrollments', [
            'trainee_id' => $trainee->id,
            'cohort_id' => $this->cohort->id,
            'status' => 'active',
            'created_by' => null,
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'trainee.created', 'actor_id' => null]);
    }

    public function test_managers_and_admins_are_notified_of_self_registration(): void
    {
        Notification::fake();
        $staff = collect(['admin', 'manager', 'facilitator'])->map(fn (string $role) => User::create([
            'name' => ucfirst($role),
            'email' => "{$role}@example.com",
            'password' => bcrypt('password123'),
            'role' => $role,
            'status' => 'approved',
            'approved_at' => now(),
        ]))->keyBy('role');

        $this->postJson('/api/v1/trainee-registrations', $this->payload())->assertCreated();

        $trainee = Trainee::firstOrFail();
        foreach (['admin', 'manager'] as $role) {
            Notification::assertSentTo(
                $staff[$role],
                PortalNotification::class,
                fn (PortalNotification $notification) => $notification->category === 'trainee'
                    && $notification->actionUrl === "/trainees/{$trainee->id}"
                    && str_contains($notification->message, 'Juma Hamisi')
                    && str_contains($notification->message, 'Python Morning'),
            );
        }
        Notification::assertNotSentTo($staff['facilitator'], PortalNotification::class);
    }

    public function test_failed_registration_sends_no_notification(): void
    {
        Notification::fake();
        User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'status' => 'approved',
            'approved_at' => now(),
        ]);
        $this->cohort->update(['max_seats' => 0]);

        $this->postJson('/api/v1/trainee-registrations', $this->payload())->assertUnprocessable();

        Notification::assertNothingSent();
    }

    public function test_uploaded_registration_form_is_ignored(): void
    {
        $this->post('/api/v1/trainee-registrations', [
            ...$this->payload(),
            'registration_form' => UploadedFile::fake()->create('form.pdf', 10, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertCreated();

        $this->assertNull(Trainee::firstOrFail()->registration_form_path);
    }

    public function test_cohort_is_required_and_must_be_active(): void
    {
        $this->postJson('/api/v1/trainee-registrations', [...$this->payload(), 'cohort_id' => null])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('cohort_id');

        $this->cohort->update(['is_active' => false]);

        $this->postJson('/api/v1/trainee-registrations', $this->payload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors('cohort_id');

        $this->assertSame(0, Trainee::count());
    }

    public function test_minor_requires_emergency_contact(): void
    {
        $this->postJson('/api/v1/trainee-registrations', [
            ...$this->payload(),
            'date_of_birth' => now()->subYears(12)->toDateString(),
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'Emergency contact information is required for a minor.');

        $this->assertSame(0, Trainee::count());
    }

    public function test_full_cohort_rejects_registration_without_leaving_a_trainee_record(): void
    {
        foreach (['Asha', 'Neema'] as $index => $name) {
            $trainee = Trainee::create([
                'trainee_number' => sprintf('VDC-2026-%06d', $index + 100),
                'full_name' => $name,
                'date_of_birth' => '2000-01-01',
                'gender' => 'female',
                'phone' => "07840000{$index}",
                'address' => 'Dar es Salaam',
            ]);
            Enrollment::create([
                'trainee_id' => $trainee->id,
                'cohort_id' => $this->cohort->id,
                'status' => 'active',
                'enrolled_at' => now(),
            ]);
        }

        $this->postJson('/api/v1/trainee-registrations', $this->payload())
            ->assertUnprocessable();

        $this->assertDatabaseMissing('trainees', ['full_name' => 'Juma Hamisi']);
    }

    public function test_same_person_cannot_register_twice(): void
    {
        $this->postJson('/api/v1/trainee-registrations', $this->payload())->assertCreated();

        $this->postJson('/api/v1/trainee-registrations', [...$this->payload(), 'full_name' => ' juma hamisi '])
            ->assertUnprocessable()
            ->assertJsonPath('success', false);

        $this->assertSame(1, Trainee::count());
    }

    public function test_staff_can_filter_trainees_by_registration_source(): void
    {
        $this->postJson('/api/v1/trainee-registrations', $this->payload())->assertCreated();
        Trainee::create([
            'trainee_number' => 'VDC-2026-000900',
            'full_name' => 'Staff Entered',
            'date_of_birth' => '2000-01-01',
            'gender' => 'female',
            'phone' => '0784999999',
            'address' => 'Dar es Salaam',
        ]);

        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'status' => 'approved',
            'approved_at' => now(),
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/trainees?source=self')
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.full_name', 'Juma Hamisi')
            ->assertJsonPath('data.data.0.registration_source', 'self');

        $this->getJson('/api/v1/trainees?source=staff')
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.full_name', 'Staff Entered');
    }

    public function test_staff_cannot_mark_their_registration_as_self(): void
    {
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'status' => 'approved',
            'approved_at' => now(),
        ]);
        Sanctum::actingAs($admin);

        $payload = $this->payload();
        unset($payload['cohort_id']);
        $this->postJson('/api/v1/trainees', [...$payload, 'registration_source' => 'self'])->assertCreated();

        $this->assertSame('staff', Trainee::firstOrFail()->registration_source);
    }

    private function payload(): array
    {
        return [
            'full_name' => 'Juma Hamisi',
            'date_of_birth' => '1998-03-14',
            'gender' => 'male',
            'phone' => '0712345678',
            'email' => 'juma@example.com',
            'address' => 'Sinza, Dar es Salaam',
            'occupation' => 'Accountant',
            'cohort_id' => $this->cohort->id,
        ];
    }
}
