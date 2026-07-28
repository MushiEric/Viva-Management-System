<?php

namespace Tests\Feature;

use App\Models\Cohort;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use App\Modules\Finance\Domain\Events\DiscountApproved;
use App\Modules\Finance\Domain\Events\InvoiceIssued;
use App\Modules\Finance\Domain\Events\PaymentRecorded;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinanceManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;
    private User $admin;
    private User $facilitator;
    private Trainee $trainee;
    private Enrollment $firstEnrollment;
    private Enrollment $secondEnrollment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->manager = $this->staff('Manager', 'manager');
        $this->admin = $this->staff('Admin', 'admin');
        $this->facilitator = $this->staff('Facilitator', 'facilitator');
        $this->trainee = Trainee::create([
            'trainee_number' => 'VDC-2026-000001',
            'full_name' => 'Juma Student',
            'date_of_birth' => '2000-01-01',
            'gender' => 'male',
        ]);
        $course = Course::create(['name' => 'Training']);
        $this->firstEnrollment = $this->enrollment($course, 'Python');
        $this->secondEnrollment = $this->enrollment($course, 'Graphic Design');
    }

    public function test_admin_creates_and_issues_multi_enrollment_invoice(): void
    {
        Event::fake();
        Sanctum::actingAs($this->admin);

        $invoiceId = $this->createInvoice([
            [$this->firstEnrollment->id, 'Python Beginner', 250000],
            [$this->secondEnrollment->id, 'Graphic Design Beginner', 200000],
        ])->assertCreated()
            ->assertJsonPath('data.invoice_number', 'INV-2026-000001')
            ->assertJsonPath('data.total', '450000.00')
            ->json('data.id');

        $this->postJson("/api/v1/finance/invoices/{$invoiceId}/issue")
            ->assertOk()
            ->assertJsonPath('data.status', 'issued');
        Event::assertDispatched(InvoiceIssued::class);
    }

    public function test_manager_approves_fixed_discount(): void
    {
        Sanctum::actingAs($this->admin);
        $invoiceId = $this->createInvoice([
            [$this->firstEnrollment->id, 'Python Beginner', 250000],
        ])->json('data.id');
        $discountId = $this->postJson("/api/v1/finance/invoices/{$invoiceId}/discounts", [
            'amount' => 50000,
            'reason' => 'Approved community discount.',
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/v1/finance/discounts/{$discountId}/approve")->assertForbidden();

        Event::fake();
        Sanctum::actingAs($this->manager);
        $this->postJson("/api/v1/finance/discounts/{$discountId}/approve")
            ->assertOk()
            ->assertJsonPath('data.invoice.total', '200000.00');
        Event::assertDispatched(DiscountApproved::class);
    }

    public function test_one_payment_can_cover_multiple_invoices(): void
    {
        Sanctum::actingAs($this->admin);
        $firstInvoice = $this->createAndIssueInvoice($this->firstEnrollment, 250000);
        $secondInvoice = $this->createAndIssueInvoice($this->secondEnrollment, 200000);

        Event::fake();
        $response = $this->postJson('/api/v1/finance/payments', [
            'trainee_id' => $this->trainee->id,
            'amount' => 300000,
            'method' => 'mobile_money',
            'provider' => 'M-Pesa',
            'reference_number' => 'ABC123XYZ',
            'allocations' => [
                ['invoice_id' => $firstInvoice, 'amount' => 200000],
                ['invoice_id' => $secondInvoice, 'amount' => 100000],
            ],
        ])->assertCreated()
            ->assertJsonPath('data.receipt_number', 'RCT-2026-000001');

        $this->assertDatabaseHas('payment_allocations', ['payment_id' => $response->json('data.id'), 'invoice_id' => $firstInvoice, 'amount' => 200000]);
        $this->assertDatabaseHas('invoices', ['id' => $firstInvoice, 'amount_paid' => 200000, 'status' => 'partially_paid']);
        $this->assertDatabaseHas('invoices', ['id' => $secondInvoice, 'amount_paid' => 100000, 'status' => 'partially_paid']);
        Event::assertDispatched(PaymentRecorded::class);
    }

    public function test_payment_cancellation_preserves_payment_and_restores_balances(): void
    {
        Sanctum::actingAs($this->admin);
        $invoiceId = $this->createAndIssueInvoice($this->firstEnrollment, 250000);
        $paymentId = $this->postJson('/api/v1/finance/payments', [
            'trainee_id' => $this->trainee->id,
            'amount' => 100000,
            'method' => 'cash',
            'allocations' => [['invoice_id' => $invoiceId, 'amount' => 100000]],
        ])->json('data.id');

        $this->postJson("/api/v1/finance/payments/{$paymentId}/cancel", ['reason' => 'Cash entry recorded twice.'])
            ->assertForbidden();

        Sanctum::actingAs($this->manager);
        $this->postJson("/api/v1/finance/payments/{$paymentId}/cancel", ['reason' => 'Cash entry recorded twice.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');

        $this->assertDatabaseHas('payments', ['id' => $paymentId, 'status' => 'cancelled']);
        $this->assertDatabaseHas('invoices', ['id' => $invoiceId, 'amount_paid' => 0, 'status' => 'issued']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'payment.cancelled']);
    }

    public function test_overpayment_and_facilitator_finance_access_are_rejected(): void
    {
        Sanctum::actingAs($this->admin);
        $invoiceId = $this->createAndIssueInvoice($this->firstEnrollment, 250000);

        $this->postJson('/api/v1/finance/payments', [
            'trainee_id' => $this->trainee->id,
            'amount' => 300000,
            'method' => 'cash',
            'allocations' => [['invoice_id' => $invoiceId, 'amount' => 300000]],
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'Payment allocation exceeds the invoice outstanding balance.');

        Sanctum::actingAs($this->facilitator);
        $this->getJson('/api/v1/finance')->assertForbidden();
    }

    private function createAndIssueInvoice(Enrollment $enrollment, int $amount): int
    {
        $invoiceId = $this->createInvoice([
            [$enrollment->id, $enrollment->cohort->name, $amount],
        ])->json('data.id');
        $this->postJson("/api/v1/finance/invoices/{$invoiceId}/issue")->assertOk();

        return $invoiceId;
    }

    private function createInvoice(array $items)
    {
        return $this->postJson('/api/v1/finance/invoices', [
            'trainee_id' => $this->trainee->id,
            'due_date' => '2026-08-31',
            'items' => array_map(fn (array $item) => [
                'enrollment_id' => $item[0],
                'description' => $item[1],
                'amount' => $item[2],
            ], $items),
        ]);
    }

    private function enrollment(Course $course, string $name): Enrollment
    {
        $cohort = Cohort::create([
            'course_id' => $course->id,
            'name' => $name,
            'schedule_window' => 'morning',
            'max_seats' => 7,
            'is_active' => true,
        ]);

        return Enrollment::create([
            'trainee_id' => $this->trainee->id,
            'cohort_id' => $cohort->id,
            'status' => 'active',
            'enrolled_at' => now(),
            'created_by' => $this->admin->id,
        ]);
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
