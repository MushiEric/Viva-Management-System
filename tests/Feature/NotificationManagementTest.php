<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Communication\Notifications\PortalNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_disable_email_but_in_app_remains_mandatory(): void
    {
        $user = $this->staff();
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/notification-settings')
            ->assertOk()
            ->assertJsonPath('data.email_notifications_enabled', true)
            ->assertJsonPath('data.in_app_notifications_enabled', true);

        $this->putJson('/api/v1/notification-settings', [
            'email_notifications_enabled' => false,
        ])->assertOk()
            ->assertJsonPath('data.email_notifications_enabled', false)
            ->assertJsonPath('data.in_app_notifications_enabled', true);

        $this->assertFalse($user->fresh()->email_notifications_enabled);
    }

    public function test_notification_channels_respect_email_preference(): void
    {
        Notification::fake();
        $user = $this->staff();
        $notification = new PortalNotification('program', 'Program Approved', 'Your program was approved.', '/programs');

        $this->assertSame(['database', 'mail'], $notification->via($user));

        $user->update(['email_notifications_enabled' => false]);
        $this->assertSame(['database'], $notification->via($user->fresh()));
    }

    public function test_staff_can_list_and_mark_notifications_as_read(): void
    {
        $user = $this->staff();
        $user->notify(new PortalNotification(
            'finance',
            'Payment Recorded',
            'Payment RCT-2026-000001 was recorded.',
            '/finance',
        ));
        Sanctum::actingAs($user);

        $notificationId = $this->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonPath('data.unread_count', 1)
            ->assertJsonPath('data.notifications.data.0.data.title', 'Payment Recorded')
            ->json('data.notifications.data.0.id');

        $this->patchJson("/api/v1/notifications/{$notificationId}/read")->assertOk();
        $this->assertNotNull($user->notifications()->findOrFail($notificationId)->read_at);

        $user->notify(new PortalNotification('program', 'Program Review', 'Review required.', '/programs'));
        $this->postJson('/api/v1/notifications/read-all')->assertOk();
        $this->assertSame(0, $user->unreadNotifications()->count());
    }

    public function test_staff_cannot_mark_another_users_notification_as_read(): void
    {
        $owner = $this->staff('owner@example.com');
        $other = $this->staff('other@example.com');
        $owner->notify(new PortalNotification('staff', 'Account Updated', 'Your account changed.'));
        Sanctum::actingAs($other);

        $this->patchJson("/api/v1/notifications/{$owner->notifications()->first()->id}/read")
            ->assertNotFound();
    }

    private function staff(string $email = 'admin@example.com'): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => $email,
            'password' => 'StrongPass123!',
            'role' => 'admin',
            'status' => 'approved',
            'approved_at' => now(),
        ]);
    }
}
