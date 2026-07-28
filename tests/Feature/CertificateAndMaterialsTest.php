<?php

namespace Tests\Feature;

use App\Models\Cohort;
use App\Models\Enrollment;
use App\Models\User;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use App\Modules\Training\Infrastructure\Models\Program;
use App\Modules\Training\Infrastructure\Models\ProgramLevel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CertificateAndMaterialsTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;
    private User $facilitator;
    private User $secondFacilitator;
    private Program $program;
    private Enrollment $enrollment;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->manager = $this->staff('Manager', 'manager');
        $this->facilitator = $this->staff('Facilitator One', 'facilitator');
        $this->secondFacilitator = $this->staff('Facilitator Two', 'facilitator');
        $this->program = Program::create([
            'name' => 'AI and Prompt Engineering',
            'status' => 'approved',
            'created_by' => $this->facilitator->id,
            'approved_by' => $this->manager->id,
            'approved_at' => now(),
        ]);
        $level = ProgramLevel::create([
            'program_id' => $this->program->id,
            'name' => 'Beginner',
            'fee_tzs' => 250000,
            'fee_status' => 'approved',
        ]);
        $cohort = Cohort::create([
            'program_level_id' => $level->id,
            'name' => 'AI August',
            'schedule_window' => 'morning',
            'max_seats' => 7,
            'is_active' => true,
        ]);
        $trainee = Trainee::create([
            'trainee_number' => 'VDC-2026-000001',
            'full_name' => 'Amina Trainee',
            'date_of_birth' => '2000-01-01',
            'gender' => 'female',
        ]);
        $this->enrollment = Enrollment::create([
            'trainee_id' => $trainee->id,
            'cohort_id' => $cohort->id,
            'status' => 'completed',
            'progress_percentage' => 100,
            'completed_at' => now(),
            'ended_at' => now(),
            'enrolled_at' => now()->subMonth(),
            'created_by' => $this->manager->id,
        ]);
    }

    public function test_completed_enrollment_generates_real_pdf_with_qr_payload_idempotently(): void
    {
        Sanctum::actingAs($this->manager);
        $response = $this->postJson("/api/v1/certificates/enrollments/{$this->enrollment->id}")
            ->assertCreated()
            ->assertJsonPath('data.certificate_number', 'VDC-CERT-2026-000001');

        $path = $response->json('data.file_path');
        Storage::disk('local')->assertExists($path);
        $this->assertStringStartsWith('%PDF', Storage::disk('local')->get($path));
        $this->assertStringStartsWith('VDC-CERTIFICATE|VDC-CERT-2026-000001|', $response->json('data.qr_payload'));

        $this->postJson("/api/v1/certificates/enrollments/{$this->enrollment->id}")->assertCreated();
        $this->assertDatabaseCount('certificates', 1);
    }

    public function test_incomplete_enrollment_cannot_receive_certificate(): void
    {
        $this->enrollment->update(['status' => 'ongoing', 'completed_at' => null]);
        Sanctum::actingAs($this->manager);

        $this->postJson("/api/v1/certificates/enrollments/{$this->enrollment->id}")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Certificates can only be issued for completed enrollments.');
    }

    public function test_facilitator_uploads_private_pdf_material_under_ten_megabytes(): void
    {
        Sanctum::actingAs($this->facilitator);
        $response = $this->post("/api/v1/programs/{$this->program->id}/learning-materials", [
            'title' => 'Prompt Engineering Reference',
            'description' => 'Class reference document.',
            'version' => '1.0',
            'material_type' => 'file',
            'file' => UploadedFile::fake()->create('reference.pdf', 1024, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertCreated();

        Storage::disk('local')->assertExists($response->json('data.file_path'));
        $this->assertDatabaseHas('learning_materials', [
            'program_id' => $this->program->id,
            'uploaded_by' => $this->facilitator->id,
            'version' => '1.0',
        ]);
    }

    public function test_material_larger_than_ten_megabytes_is_rejected(): void
    {
        Sanctum::actingAs($this->facilitator);
        $this->post("/api/v1/programs/{$this->program->id}/learning-materials", [
            'title' => 'Oversized Material',
            'version' => '1.0',
            'material_type' => 'file',
            'file' => UploadedFile::fake()->create('large.pdf', 10241, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();
    }

    public function test_rich_text_is_sanitized_and_other_facilitator_can_deactivate_it(): void
    {
        Sanctum::actingAs($this->facilitator);
        $materialId = $this->postJson("/api/v1/programs/{$this->program->id}/learning-materials", [
            'title' => 'Prompt Lesson',
            'version' => '1.1',
            'material_type' => 'rich_text',
            'rich_text' => '<h2>Prompt Structure</h2><img src="https://example.com/image.png" onerror="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)">Bad Link</a>',
        ])->assertCreated()->json('data.id');

        $material = \App\Modules\Training\Infrastructure\Models\LearningMaterial::findOrFail($materialId);
        $this->assertStringContainsString('<h2>Prompt Structure</h2>', $material->rich_text);
        $this->assertStringNotContainsString('onerror', $material->rich_text);
        $this->assertStringNotContainsString('<script', $material->rich_text);
        $this->assertStringNotContainsString('javascript:', $material->rich_text);

        Sanctum::actingAs($this->secondFacilitator);
        $this->deleteJson("/api/v1/learning-materials/{$materialId}")->assertOk();
        $this->assertSoftDeleted('learning_materials', ['id' => $materialId]);
    }

    private function staff(string $name, string $role): User
    {
        return User::create([
            'name' => $name,
            'email' => str($name)->slug().'@example.com',
            'password' => bcrypt('password123'),
            'role' => $role,
            'status' => 'approved',
            'approved_at' => now(),
        ]);
    }
}
