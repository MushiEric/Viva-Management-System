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
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
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
            'syllabus_outline' => [
                [
                    'title' => 'Collections and Functions',
                    'submodules' => [
                        ['title' => 'Lists'],
                        ['title' => 'Tuples'],
                        ['title' => 'Dictionaries'],
                    ],
                ],
                ['title' => 'Variables and Data Types'],
            ],
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
        $this->assertSame(
            ['Collections and Functions', 'Variables and Data Types'],
            collect(ProgramLevel::where('program_id', $programId)->firstOrFail()->syllabus_outline)
                ->pluck('title')
                ->all(),
        );
        $this->assertSame(
            ['Lists', 'Tuples', 'Dictionaries'],
            collect(ProgramLevel::where('program_id', $programId)->firstOrFail()->syllabus_outline[0]['submodules'])
                ->pluck('title')
                ->all(),
        );
        $this->assertDatabaseHas('audit_logs', ['action' => 'program_level.created']);
    }

    public function test_facilitator_can_add_optional_program_card_image(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->facilitator);

        $response = $this->post('/api/v1/programs', [
            'name' => 'Python Programming',
            'description' => 'Practical Python training.',
            'image' => UploadedFile::fake()->image('python.png', 1200, 630)->size(500),
        ])->assertCreated();

        Storage::disk('public')->assertExists($response->json('data.image_path'));
        $this->get("/api/v1/programs/{$response->json('data.id')}/image")
            ->assertOk()
            ->assertHeader('content-type', 'image/png');
    }

    public function test_program_level_requires_at_least_one_syllabus_outline_topic(): void
    {
        Sanctum::actingAs($this->facilitator);
        $program = Program::create([
            'name' => 'Digital Essentials',
            'status' => 'draft',
            'created_by' => $this->facilitator->id,
        ]);

        $this->postJson("/api/v1/programs/{$program->id}/levels", [
            'name' => 'Beginner',
            'fee_tzs' => 150000,
            'syllabus_outline' => [],
        ])->assertJsonValidationErrors('syllabus_outline');
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

    public function test_facilitator_can_edit_and_resubmit_a_program_after_changes_are_requested(): void
    {
        $program = $this->programWithLevel();
        $program->update(['status' => 'pending_approval']);
        Sanctum::actingAs($this->manager);
        $this->postJson("/api/v1/programs/{$program->id}/request-changes", [
            'notes' => 'Expand the collections roadmap.',
        ])->assertOk();

        Sanctum::actingAs($this->facilitator);
        $this->putJson("/api/v1/programs/{$program->id}", [
            'name' => 'Digital Literacy and Productivity',
            'description' => 'Updated after manager review.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'changes_requested')
            ->assertJsonPath('data.review_notes', 'Expand the collections roadmap.');

        $this->putJson("/api/v1/program-levels/{$program->levels->first()->id}", [
            'name' => 'Beginner',
            'fee_tzs' => 150000,
            'syllabus_outline' => [
                [
                    'title' => 'Collections',
                    'submodules' => [
                        ['title' => 'Lists'],
                        ['title' => 'Dictionaries'],
                    ],
                ],
            ],
        ])->assertOk()
            ->assertJsonPath('data.syllabus_outline.0.submodules.1.title', 'Dictionaries');

        $this->postJson("/api/v1/programs/{$program->id}/submit")
            ->assertOk()
            ->assertJsonPath('data.status', 'pending_approval')
            ->assertJsonPath('data.review_notes', null);
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
