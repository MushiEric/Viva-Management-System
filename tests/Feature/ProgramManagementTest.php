<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Communication\Notifications\PortalNotification;
use App\Modules\Training\Domain\Events\ProgramApproved;
use App\Modules\Training\Domain\Events\ProgramFeeApproved;
use App\Modules\Training\Domain\Events\ProgramSubmittedForApproval;
use App\Modules\Training\Infrastructure\Models\Program;
use App\Modules\Training\Infrastructure\Models\ProgramLevel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProgramManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private User $admin;

    private User $facilitator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->manager = $this->staff('Manager', 'manager');
        $this->admin = $this->staff('Admin', 'admin');
        $this->facilitator = $this->staff('Facilitator', 'facilitator');
    }

    public function test_facilitator_can_create_program_with_flexible_level(): void
    {
        Sanctum::actingAs($this->facilitator);

        $programId = $this->postJson('/api/v1/programs', [
            'name' => 'Python Programming',
            'description' => 'Practical Python training.',
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/v1/programs/{$programId}/levels", [
            'name' => 'Beginner',
            'syllabus' => '# Introduction to Python',
            'duration_weeks' => 4,
            'training_days_per_week' => 6,
            'fee_tzs' => 250000,
            'facilitator_ids' => [$this->facilitator->id],
        ])->assertCreated()->assertJsonPath('data.fee_status', 'pending_approval');

        $this->assertDatabaseHas('program_levels', [
            'program_id' => $programId,
            'duration_weeks' => 4,
            'training_days_per_week' => 6,
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'program_level.created']);
    }

    public function test_program_requires_level_before_submission(): void
    {
        Sanctum::actingAs($this->facilitator);
        $program = Program::create([
            'name' => 'Graphic Design',
            'status' => 'draft',
            'created_by' => $this->facilitator->id,
        ]);

        $this->postJson("/api/v1/programs/{$program->id}/submit")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Add at least one program level before submitting for approval.');
    }

    public function test_facilitator_submits_and_manager_approves_program_and_fee(): void
    {
        Event::fake();
        $program = $this->programWithLevel();

        Sanctum::actingAs($this->facilitator);
        $this->postJson("/api/v1/programs/{$program->id}/submit")
            ->assertOk()
            ->assertJsonPath('data.status', 'pending_approval');
        Event::assertDispatched(ProgramSubmittedForApproval::class);

        Sanctum::actingAs($this->manager);
        $this->postJson("/api/v1/programs/{$program->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');
        $this->postJson("/api/v1/program-levels/{$program->levels->first()->id}/approve-fee")
            ->assertOk()
            ->assertJsonPath('data.fee_status', 'approved');

        Event::assertDispatched(ProgramApproved::class);
        Event::assertDispatched(ProgramFeeApproved::class);
    }

    public function test_manager_can_request_changes_with_notes(): void
    {
        $program = $this->programWithLevel();
        $program->update(['status' => 'pending_approval']);
        Sanctum::actingAs($this->manager);

        $this->postJson("/api/v1/programs/{$program->id}/request-changes", [
            'notes' => 'Clarify practical learning outcomes.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'changes_requested')
            ->assertJsonPath('data.review_notes', 'Clarify practical learning outcomes.');
    }

    public function test_program_creator_receives_in_app_notification_when_program_is_approved(): void
    {
        Notification::fake();
        $program = $this->programWithLevel();
        $program->update(['status' => 'pending_approval']);
        Sanctum::actingAs($this->manager);

        $this->postJson("/api/v1/programs/{$program->id}/approve")->assertOk();

        Notification::assertSentTo(
            $this->facilitator,
            PortalNotification::class,
            fn ($notification) => $notification->title === 'Program Approved'
                && $notification->metadata['program_id'] === $program->id,
        );
    }

    public function test_admin_can_view_but_cannot_draft_or_approve_programs(): void
    {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/v1/programs')->assertOk();
        $this->postJson('/api/v1/programs', ['name' => 'Not Allowed'])->assertForbidden();

        $program = $this->programWithLevel();
        $program->update(['status' => 'pending_approval']);
        $this->postJson("/api/v1/programs/{$program->id}/approve")->assertForbidden();
    }

    private function programWithLevel(): Program
    {
        $program = Program::create([
            'name' => 'Digital Literacy',
            'status' => 'draft',
            'created_by' => $this->facilitator->id,
        ]);
        ProgramLevel::create([
            'program_id' => $program->id,
            'name' => 'Beginner',
            'duration_weeks' => 4,
            'training_days_per_week' => 6,
            'fee_tzs' => 150000,
            'fee_status' => 'pending_approval',
        ]);

        return $program->load('levels');
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
