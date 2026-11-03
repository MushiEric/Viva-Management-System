<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Communication\Notifications\PortalNotification;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use App\Modules\Training\Infrastructure\Models\Program;
use App\Modules\Training\Infrastructure\Models\ProgramLevel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TraineeSelfRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private Program $program;

    private ProgramLevel $level;

    protected function setUp(): void
    {
        parent::setUp();

        $creator = User::create([
            'name' => 'Manager',
            'email' => 'creator@example.com',
            'password' => bcrypt('password123'),
            'role' => 'manager',
            'status' => 'approved',
            'approved_at' => now(),
        ]);
        $this->program = Program::create(['name' => 'Digital Essentials', 'status' => 'approved', 'created_by' => $creator->id]);
        $this->level = $this->program->levels()->create([
            'name' => 'Beginner',
            'fee_tzs' => 150000,
            'fee_status' => 'approved',
            'duration_weeks' => 4,
        ]);
    }

    public function test_guest_can_register_for_a_course_without_being_enrolled(): void
    {
        $this->postJson('/api/v1/trainee-registrations', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.full_name', 'Juma Hamisi')
            ->assertJsonPath('data.course_name', 'Digital Essentials — Beginner')
            ->assertJsonMissingPath('data.id')
            ->assertJsonMissingPath('data.phone');

        $trainee = Trainee::where('full_name', 'Juma Hamisi')->firstOrFail();
        $this->assertMatchesRegularExpression('/^VDC-\d{4}-\d{6}$/', $trainee->trainee_number);
        $this->assertNull($trainee->registration_form_path);
        $this->assertSame('self', $trainee->registration_source);
        $this->assertSame($this->level->id, $trainee->requested_program_level_id);
        $this->assertNull($trainee->date_of_birth);
        $this->assertDatabaseCount('enrollments', 0);
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
                    && str_contains($notification->message, 'Digital Essentials — Beginner'),
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
        $this->level->update(['fee_status' => 'pending_approval']);

        $this->postJson('/api/v1/trainee-registrations', $this->payload())->assertUnprocessable();

        Notification::assertNothingSent();
    }

    public function test_trainee_receives_confirmation_sms_via_beem(): void
    {
        config([
            'services.beem.key' => 'test-key',
            'services.beem.secret' => 'test-secret',
            'services.beem.sender_id' => 'VIVA',
        ]);
        Http::fake(['apisms.beem.africa/*' => Http::response(['successful' => true])]);

        $this->postJson('/api/v1/trainee-registrations', [...$this->payload(), 'phone' => '+255 712 345 678'])
            ->assertCreated();

        $trainee = Trainee::firstOrFail();
        Http::assertSentCount(1);
        Http::assertSent(fn (HttpRequest $request) => $request->url() === 'https://apisms.beem.africa/v1/send'
            && $request->hasHeader('Authorization', 'Basic '.base64_encode('test-key:test-secret'))
            && $request['source_addr'] === 'VIVA'
            && $request['recipients'][0]['dest_addr'] === '255712345678'
            && str_starts_with($request['message'], 'Hello Juma, you are registered at VIVA Digital Center for Digital Essentials — Beginner.')
            && str_contains($request['message'], $trainee->trainee_number));
    }

    public function test_sms_is_skipped_when_beem_is_not_configured(): void
    {
        config(['services.beem.key' => null]);
        Http::fake();

        $this->postJson('/api/v1/trainee-registrations', $this->payload())->assertCreated();

        Http::assertNothingSent();
    }

    public function test_sms_gateway_failure_does_not_break_registration(): void
    {
        config([
            'services.beem.key' => 'test-key',
            'services.beem.secret' => 'test-secret',
            'services.beem.sender_id' => 'VIVA',
        ]);
        Http::fake(['*' => Http::response(['error' => 'Invalid credentials'], 401)]);

        $this->postJson('/api/v1/trainee-registrations', $this->payload())->assertCreated();

        $this->assertSame(1, Trainee::count());
    }

    public function test_uploaded_registration_form_is_ignored(): void
    {
        $this->post('/api/v1/trainee-registrations', [
            ...$this->payload(),
            'registration_form' => UploadedFile::fake()->create('form.pdf', 10, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertCreated();

        $this->assertNull(Trainee::firstOrFail()->registration_form_path);
    }

    public function test_course_is_required_and_must_be_open_for_registration(): void
    {
        $this->postJson('/api/v1/trainee-registrations', [...$this->payload(), 'program_level_id' => null])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('program_level_id');

        $this->level->update(['fee_status' => 'pending_approval']);
        $this->postJson('/api/v1/trainee-registrations', $this->payload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors('program_level_id');

        $this->level->update(['fee_status' => 'approved']);
        $this->program->update(['status' => 'draft']);
        $this->postJson('/api/v1/trainee-registrations', $this->payload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors('program_level_id');

        $this->assertSame(0, Trainee::count());
    }

    public function test_date_of_birth_is_still_validated_when_given(): void
    {
        $this->postJson('/api/v1/trainee-registrations', [...$this->payload(), 'date_of_birth' => now()->addDay()->toDateString()])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('date_of_birth');
    }

    public function test_minor_requires_emergency_contact_when_date_of_birth_is_given(): void
    {
        $this->postJson('/api/v1/trainee-registrations', [
            ...$this->payload(),
            'date_of_birth' => now()->subYears(12)->toDateString(),
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'Emergency contact information is required for a minor.');

        $this->assertSame(0, Trainee::count());
    }

    public function test_course_options_list_only_courses_open_for_registration(): void
    {
        $this->program->levels()->create(['name' => 'Advanced', 'fee_tzs' => 300000, 'fee_status' => 'pending_approval']);
        $draft = Program::create(['name' => 'Draft Program', 'status' => 'draft', 'created_by' => $this->program->created_by]);
        $draft->levels()->create(['name' => 'Beginner', 'fee_tzs' => 100000, 'fee_status' => 'approved']);

        $this->getJson('/api/v1/course-options')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.program_level_id', $this->level->id)
            ->assertJsonPath('data.0.display_name', 'Digital Essentials — Beginner')
            ->assertJsonPath('data.0.duration_weeks', 4);
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
            ->assertJsonPath('data.data.0.registration_source', 'self')
            ->assertJsonPath('data.data.0.requested_level.name', 'Beginner')
            ->assertJsonPath('data.data.0.requested_level.program.name', 'Digital Essentials');

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
        unset($payload['program_level_id']);
        $this->postJson('/api/v1/trainees', [...$payload, 'registration_source' => 'self'])->assertCreated();

        $this->assertSame('staff', Trainee::firstOrFail()->registration_source);
    }

    private function payload(): array
    {
        return [
            'full_name' => 'Juma Hamisi',
            'gender' => 'male',
            'phone' => '0712345678',
            'email' => 'juma@example.com',
            'address' => 'Sinza, Dar es Salaam',
            'occupation' => 'Accountant',
            'program_level_id' => $this->level->id,
        ];
    }
}
