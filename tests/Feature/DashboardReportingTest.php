<?php

namespace Tests\Feature;

use App\Models\Cohort;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use App\Modules\Audit\Infrastructure\Models\AuditLog;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use App\Modules\Finance\Infrastructure\Models\Invoice;
use App\Modules\Finance\Infrastructure\Models\Payment;
use App\Modules\Training\Infrastructure\Models\Program;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardReportingTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;
    private User $admin;
    private User $facilitator;
    private Trainee $trainee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->manager = $this->staff('Manager', 'manager');
        $this->admin = $this->staff('Admin', 'admin');
        $this->facilitator = $this->staff('Facilitator', 'facilitator');
        $this->trainee = Trainee::create([
            'trainee_number' => 'VDC-2026-000001',
            'full_name' => 'Report Student',
            'date_of_birth' => '2000-01-01',
            'gender' => 'male',
        ]);
    }

    public function test_manager_dashboard_contains_operations_finance_approvals_and_activity(): void
    {
        User::create([
            'name' => 'Pending Staff',
            'email' => 'pending@example.com',
            'password' => bcrypt('password123'),
            'role' => 'facilitator',
            'status' => 'pending',
        ]);
        Program::create([
            'name' => 'Pending Program',
            'status' => 'pending_approval',
            'created_by' => $this->facilitator->id,
        ]);
        Invoice::create([
            'invoice_number' => 'INV-2026-000001',
            'trainee_id' => $this->trainee->id,
            'status' => 'issued',
            'currency' => 'TZS',
            'subtotal' => 250000,
            'total' => 250000,
            'amount_paid' => 100000,
            'created_by' => $this->admin->id,
        ]);
        AuditLog::create([
            'actor_id' => $this->admin->id,
            'action' => 'trainee.created',
            'subject_type' => Trainee::class,
            'subject_id' => $this->trainee->id,
            'created_at' => now(),
        ]);

        Sanctum::actingAs($this->manager);
        $this->getJson('/api/v1/dashboard')
            ->assertOk()
            ->assertJsonPath('data.pending_approvals.staff', 1)
            ->assertJsonPath('data.pending_approvals.programs', 1)
            ->assertJsonPath('data.finance.outstanding', 150000)
            ->assertJsonCount(1, 'data.recent_activity');
    }

    public function test_facilitator_dashboard_excludes_finance_audit_and_reports(): void
    {
        Sanctum::actingAs($this->facilitator);

        $response = $this->getJson('/api/v1/dashboard')->assertOk();
        $response->assertJsonMissingPath('data.finance');
        $response->assertJsonMissingPath('data.recent_activity');
        $response->assertJsonMissingPath('data.pending_approvals');
        $this->getJson('/api/v1/reports?period=monthly')->assertForbidden();
        $this->getJson('/api/v1/audit-logs')->assertForbidden();
    }

    public function test_admin_can_search_audit_activity(): void
    {
        AuditLog::create([
            'actor_id' => $this->admin->id,
            'action' => 'payment.recorded',
            'subject_type' => Payment::class,
            'subject_id' => 99,
            'created_at' => now(),
        ]);
        AuditLog::create([
            'actor_id' => $this->manager->id,
            'action' => 'program.approved',
            'subject_type' => Program::class,
            'subject_id' => 88,
            'created_at' => now(),
        ]);

        Sanctum::actingAs($this->admin);
        $this->getJson('/api/v1/audit-logs?search=payment')
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.action', 'payment.recorded');
    }

    public function test_custom_report_returns_accurate_operational_and_finance_totals(): void
    {
        $course = Course::create(['name' => 'Python']);
        $cohort = Cohort::create([
            'course_id' => $course->id,
            'name' => 'Python Morning',
            'schedule_window' => 'morning',
            'max_seats' => 7,
            'is_active' => true,
        ]);
        Enrollment::create([
            'trainee_id' => $this->trainee->id,
            'cohort_id' => $cohort->id,
            'status' => 'completed',
            'progress_percentage' => 100,
            'enrolled_at' => '2026-07-10 09:00:00',
            'completed_at' => '2026-07-25 12:00:00',
            'created_by' => $this->admin->id,
        ]);
        Payment::create([
            'receipt_number' => 'RCT-2026-000001',
            'trainee_id' => $this->trainee->id,
            'amount' => 150000,
            'currency' => 'TZS',
            'method' => 'cash',
            'status' => 'confirmed',
            'paid_at' => '2026-07-15 10:00:00',
            'recorded_by' => $this->admin->id,
        ]);

        Sanctum::actingAs($this->admin);
        $this->getJson('/api/v1/reports?period=custom&from=2026-07-01&to=2026-07-31')
            ->assertOk()
            ->assertJsonPath('data.summary.new_enrollments', 1)
            ->assertJsonPath('data.summary.completed_enrollments', 1)
            ->assertJsonPath('data.summary.payments_received', 150000)
            ->assertJsonPath('data.payments_by_method.cash', 150000);
    }

    public function test_invalid_custom_report_range_is_rejected(): void
    {
        Sanctum::actingAs($this->manager);
        $this->getJson('/api/v1/reports?period=custom&from=2026-07-31&to=2026-07-01')
            ->assertUnprocessable();
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
