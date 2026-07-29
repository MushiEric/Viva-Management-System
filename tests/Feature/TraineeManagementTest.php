<?php

namespace Tests\Feature;

use App\Models\Cohort;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use App\Modules\Finance\Infrastructure\Models\Invoice;
use App\Modules\Finance\Infrastructure\Models\InvoiceItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TraineeManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Trainee $trainee;

    private Cohort $source;

    private Cohort $target;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'status' => 'approved',
            'approved_at' => now(),
        ]);
        $this->trainee = Trainee::create([
            'trainee_number' => 'VDC-2026-000001',
            'full_name' => 'Asha Mwanafunzi',
            'date_of_birth' => '2000-05-10',
            'gender' => 'female',
            'phone' => '0784000000',
            'address' => 'Kigamboni, Dar es Salaam',
        ]);
        $course = Course::create(['name' => 'Python']);
        $this->source = $this->cohort($course, 'Python Morning');
        $this->target = $this->cohort($course, 'Python Evening');
        Sanctum::actingAs($this->admin);
    }

    public function test_staff_can_search_and_view_complete_trainee_history(): void
    {
        Enrollment::create([
            'trainee_id' => $this->trainee->id,
            'cohort_id' => $this->source->id,
            'status' => 'active',
            'enrolled_at' => now(),
        ]);

        $this->getJson('/api/v1/trainees?search=Asha')
            ->assertOk()
            ->assertJsonPath('data.data.0.trainee_number', 'VDC-2026-000001');

        $this->getJson("/api/v1/trainees/{$this->trainee->id}")
            ->assertOk()
            ->assertJsonPath('data.trainee.enrollments.0.cohort.name', 'Python Morning');
    }

    public function test_minor_update_requires_emergency_contact(): void
    {
        $this->putJson("/api/v1/trainees/{$this->trainee->id}", [
            'full_name' => $this->trainee->full_name,
            'date_of_birth' => now()->subYears(12)->toDateString(),
            'gender' => 'female',
            'phone' => $this->trainee->phone,
            'address' => $this->trainee->address,
        ])->assertUnprocessable();

        $this->putJson("/api/v1/trainees/{$this->trainee->id}", [
            'full_name' => $this->trainee->full_name,
            'date_of_birth' => now()->subYears(12)->toDateString(),
            'gender' => 'female',
            'phone' => $this->trainee->phone,
            'address' => $this->trainee->address,
            'emergency_contact' => [
                'full_name' => 'Parent Name',
                'relationship' => 'Mother',
                'phone' => '0784111111',
            ],
        ])->assertOk();

        $this->assertDatabaseHas('emergency_contacts', [
            'trainee_id' => $this->trainee->id,
            'relationship' => 'Mother',
        ]);
    }

    public function test_staff_can_upload_a_registration_pdf(): void
    {
        Storage::fake('local');

        $response = $this->post('/api/v1/trainees', [
            'full_name' => 'Neema Student',
            'date_of_birth' => '2001-04-20',
            'gender' => 'female',
            'phone' => '0712345678',
            'address' => 'Temeke, Dar es Salaam',
            'registration_form' => UploadedFile::fake()->create('registration.pdf', 500, 'application/pdf'),
        ])->assertCreated();

        $path = $response->json('data.registration_form_path');
        Storage::disk('local')->assertExists($path);
    }

    public function test_registration_form_cannot_exceed_five_megabytes(): void
    {
        Storage::fake('local');

        $this->post('/api/v1/trainees', [
            'full_name' => 'Large File Student',
            'date_of_birth' => '2001-04-20',
            'gender' => 'male',
            'phone' => '0712345678',
            'address' => 'Temeke, Dar es Salaam',
            'registration_form' => UploadedFile::fake()->create('registration.pdf', 5121, 'application/pdf'),
        ])->assertJsonValidationErrors('registration_form');
    }

    public function test_active_trainee_cannot_be_deactivated(): void
    {
        Enrollment::create([
            'trainee_id' => $this->trainee->id,
            'cohort_id' => $this->source->id,
            'status' => 'active',
            'enrolled_at' => now(),
        ]);

        $this->deleteJson("/api/v1/trainees/{$this->trainee->id}")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'A trainee with an active enrollment cannot be deactivated.');
    }

    public function test_transfer_moves_learning_and_finance_links_and_preserves_history(): void
    {
        $original = Enrollment::create([
            'trainee_id' => $this->trainee->id,
            'cohort_id' => $this->source->id,
            'status' => 'ongoing',
            'progress_percentage' => 45,
            'enrolled_at' => now(),
            'created_by' => $this->admin->id,
        ]);
        DB::table('assessments')->insert([
            'enrollment_id' => $original->id,
            'title' => 'Python Basics',
            'percentage' => 72,
            'recorded_by' => $this->admin->id,
            'assessed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('enrollment_notes')->insert([
            'enrollment_id' => $original->id,
            'note' => 'Strong practical progress.',
            'recorded_by' => $this->admin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $invoice = Invoice::create([
            'invoice_number' => 'INV-2026-000001',
            'trainee_id' => $this->trainee->id,
            'status' => 'issued',
            'currency' => 'TZS',
            'subtotal' => 250000,
            'total' => 250000,
            'amount_paid' => 0,
            'created_by' => $this->admin->id,
        ]);
        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'enrollment_id' => $original->id,
            'description' => 'Python Beginner',
            'amount' => 250000,
        ]);

        $response = $this->postJson("/api/v1/staff/enrollments/{$original->id}/transfer", [
            'cohort_id' => $this->target->id,
            'reason' => 'Trainee changed to the evening session.',
        ])->assertCreated();

        $replacementId = $response->json('data.id');
        $this->assertDatabaseHas('enrollments', [
            'id' => $original->id,
            'status' => 'transferred',
            'transferred_to_enrollment_id' => $replacementId,
        ]);
        $this->assertDatabaseHas('enrollments', [
            'id' => $replacementId,
            'progress_percentage' => 45,
        ]);
        $this->assertDatabaseHas('assessments', ['enrollment_id' => $replacementId]);
        $this->assertDatabaseHas('enrollment_notes', ['enrollment_id' => $replacementId]);
        $this->assertDatabaseHas('invoice_items', ['enrollment_id' => $replacementId]);
        $this->assertDatabaseHas('enrollment_transfers', [
            'from_enrollment_id' => $original->id,
            'to_enrollment_id' => $replacementId,
            'reason' => 'Trainee changed to the evening session.',
        ]);
    }

    private function cohort(Course $course, string $name): Cohort
    {
        return Cohort::create([
            'course_id' => $course->id,
            'name' => $name,
            'schedule_window' => 'morning',
            'max_seats' => 7,
            'is_active' => true,
        ]);
    }
}
