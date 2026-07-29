<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SystemSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_and_update_system_settings(): void
    {
        Sanctum::actingAs($this->staff('Admin', 'admin'));

        $this->getJson('/api/v1/settings')
            ->assertOk()
            ->assertJsonPath('data.brand_name', 'VIVA DIGITAL CENTER');

        $this->putJson('/api/v1/settings', [
            'brand_name' => 'VIVA DIGITAL ACADEMY',
            'phone' => '+255 784 906 044',
            'location' => 'Kigamboni, Dar es Salaam',
            'website' => 'vivadigitalcenter.com',
            'email' => 'vivadigitalcenter@gmail.com',
            'tin' => '154-227-148',
        ])->assertOk()
            ->assertJsonPath('data.brand_name', 'VIVA DIGITAL ACADEMY');

        $this->assertDatabaseHas('system_settings', [
            'id' => 1,
            'brand_name' => 'VIVA DIGITAL ACADEMY',
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'settings.updated']);
    }

    public function test_facilitator_cannot_access_system_settings(): void
    {
        Sanctum::actingAs($this->staff('Facilitator', 'facilitator'));

        $this->getJson('/api/v1/settings')->assertForbidden();
        $this->putJson('/api/v1/settings', [
            'brand_name' => 'Not Allowed',
            'phone' => '000',
            'location' => 'Nowhere',
            'website' => 'example.com',
        ])->assertForbidden();
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
