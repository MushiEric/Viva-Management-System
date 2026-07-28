<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Identity\Domain\Events\StaffAccountApproved;
use App\Modules\Identity\Domain\Events\StaffAccountCreated;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StaffManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->manager = User::create([
            'name' => 'Manager',
            'email' => 'manager@example.com',
            'password' => bcrypt('password123'),
            'role' => 'manager',
            'status' => 'approved',
            'approved_at' => now(),
        ]);

        $this->admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'status' => 'approved',
            'approved_by' => $this->manager->id,
            'approved_at' => now(),
        ]);
    }

    public function test_admin_creates_pending_staff_account(): void
    {
        Event::fake();
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/staff', [
            'name' => 'New Facilitator',
            'email' => 'facilitator@example.com',
            'phone' => '0784000000',
            'role' => 'facilitator',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertCreated()->assertJsonPath('data.status', 'pending');
        $this->assertDatabaseHas('users', [
            'email' => 'facilitator@example.com',
            'role' => 'facilitator',
            'status' => 'pending',
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'staff.created']);
        Event::assertDispatched(StaffAccountCreated::class);
    }

    public function test_only_manager_can_approve_staff(): void
    {
        $staff = User::create([
            'name' => 'Facilitator',
            'email' => 'facilitator@example.com',
            'password' => bcrypt('password123'),
            'role' => 'facilitator',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($this->admin);
        $this->postJson("/api/v1/staff/{$staff->id}/approve")->assertForbidden();

        Event::fake();
        Sanctum::actingAs($this->manager);
        $this->postJson("/api/v1/staff/{$staff->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('users', [
            'id' => $staff->id,
            'approved_by' => $this->manager->id,
        ]);
        Event::assertDispatched(StaffAccountApproved::class);
    }

    public function test_pending_staff_cannot_log_in(): void
    {
        User::create([
            'name' => 'Pending Facilitator',
            'email' => 'pending@example.com',
            'password' => bcrypt('password123'),
            'role' => 'facilitator',
            'status' => 'pending',
        ]);

        $this->postJson('/api/v1/token', [
            'email' => 'pending@example.com',
            'password' => 'password123',
        ])->assertUnprocessable();
    }

    public function test_manager_can_grant_facilitator_finance_access(): void
    {
        $facilitator = User::create([
            'name' => 'Facilitator',
            'email' => 'facilitator@example.com',
            'password' => bcrypt('password123'),
            'role' => 'facilitator',
            'status' => 'approved',
        ]);

        Sanctum::actingAs($this->manager);
        $this->putJson("/api/v1/staff/{$facilitator->id}/permissions", [
            'overrides' => ['finance.view' => true],
        ])->assertOk();

        $this->assertDatabaseHas('permission_overrides', [
            'user_id' => $facilitator->id,
            'permission' => 'finance.view',
            'allowed' => true,
        ]);
    }

    public function test_deactivation_is_soft_and_self_deactivation_is_blocked(): void
    {
        Sanctum::actingAs($this->admin);
        $this->deleteJson("/api/v1/staff/{$this->admin->id}")->assertUnprocessable();

        $staff = User::create([
            'name' => 'Facilitator',
            'email' => 'facilitator@example.com',
            'password' => bcrypt('password123'),
            'role' => 'facilitator',
            'status' => 'approved',
        ]);

        $this->deleteJson("/api/v1/staff/{$staff->id}")->assertOk();
        $this->assertSoftDeleted('users', ['id' => $staff->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'staff.deactivated']);
    }

    public function test_admin_role_change_requires_fresh_manager_approval(): void
    {
        Sanctum::actingAs($this->admin);

        $this->putJson("/api/v1/staff/{$this->admin->id}", [
            'name' => $this->admin->name,
            'email' => $this->admin->email,
            'role' => 'manager',
        ])->assertOk()->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('users', [
            'id' => $this->admin->id,
            'role' => 'manager',
            'status' => 'pending',
            'approved_by' => null,
        ]);
    }
}
