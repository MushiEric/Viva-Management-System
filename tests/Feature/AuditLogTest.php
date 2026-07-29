<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Audit\Infrastructure\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_filter_audit_logs_and_receive_filter_options(): void
    {
        $admin = $this->staff('Admin', 'admin');
        $manager = $this->staff('Manager', 'manager');
        AuditLog::create([
            'actor_id' => $manager->id,
            'action' => 'settings.updated',
            'subject_type' => 'App\\Modules\\Settings\\Infrastructure\\Models\\SystemSetting',
            'subject_id' => 1,
            'before' => ['brand_name' => 'Old Name'],
            'after' => ['brand_name' => 'New Name'],
            'ip_address' => '127.0.0.1',
            'created_at' => now(),
        ]);
        AuditLog::create([
            'actor_id' => $admin->id,
            'action' => 'trainee.created',
            'subject_type' => 'App\\Modules\\Enrollment\\Infrastructure\\Models\\Trainee',
            'subject_id' => 2,
            'created_at' => now()->subDay(),
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/audit-logs?action=settings.updated&actor_id='.$manager->id)
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.action', 'settings.updated')
            ->assertJsonPath('data.data.0.actor.role', 'manager')
            ->assertJsonFragment(['actions' => ['settings.updated', 'trainee.created']]);
    }

    public function test_facilitator_cannot_view_audit_logs(): void
    {
        Sanctum::actingAs($this->staff('Facilitator', 'facilitator'));

        $this->getJson('/api/v1/audit-logs')->assertForbidden();
    }

    private function staff(string $name, string $role): User
    {
        return User::create([
            'name' => $name,
            'email' => strtolower($name).'@example.com',
            'password' => 'StrongPass123!',
            'role' => $role,
            'status' => 'approved',
            'approved_at' => now(),
        ]);
    }
}
