<?php

namespace Tests\Feature;

use App\Mail\ContactInquiryConfirmation;
use App\Models\User;
use App\Modules\Communication\Domain\Events\ContactInquirySubmitted;
use App\Modules\Communication\Infrastructure\Models\ContactInquiry;
use App\Modules\Communication\Listeners\SendContactInquiryEmails;
use App\Modules\Communication\Notifications\PortalNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ContactInquiryTest extends TestCase
{
    use RefreshDatabase;

    public function test_website_visitor_can_submit_a_contact_inquiry(): void
    {
        Event::fake();

        $response = $this->postJson('/api/v1/contact-inquiries', [
            'name' => 'Asha Mushi',
            'email' => 'asha@example.com',
            'phone' => '+255 712 345 678',
            'program_of_interest' => 'Software Development & Programming',
            'message' => 'I would like to know when the next class starts.',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['id']]);

        $this->assertDatabaseHas('contact_inquiries', [
            'name' => 'Asha Mushi',
            'email' => 'asha@example.com',
            'phone' => '+255 712 345 678',
            'program_of_interest' => 'Software Development & Programming',
            'status' => 'new',
        ]);
        Event::assertDispatched(ContactInquirySubmitted::class);
    }

    public function test_contact_inquiry_requires_valid_contact_details(): void
    {
        $this->postJson('/api/v1/contact-inquiries', [
            'name' => '',
            'email' => 'not-an-email',
            'message' => '',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'message']);
    }

    public function test_manager_and_admin_can_view_and_manage_inquiries(): void
    {
        $manager = $this->staff('Manager', 'manager');
        $admin = $this->staff('Admin', 'admin');
        $inquiry = ContactInquiry::create([
            'name' => 'Website Visitor',
            'email' => 'visitor@example.com',
            'message' => 'Please contact me.',
        ]);

        Sanctum::actingAs($manager);
        $this->getJson('/api/v1/contact-inquiries')
            ->assertOk()
            ->assertJsonPath('data.summary.new', 1)
            ->assertJsonPath('data.inquiries.data.0.id', $inquiry->id);

        Sanctum::actingAs($admin);
        $this->patchJson("/api/v1/contact-inquiries/{$inquiry->id}", [
            'status' => 'contacted',
        ])->assertOk()->assertJsonPath('data.status', 'contacted');
    }

    public function test_facilitator_cannot_view_or_manage_inquiries(): void
    {
        $facilitator = $this->staff('Facilitator', 'facilitator');
        $inquiry = ContactInquiry::create([
            'name' => 'Website Visitor',
            'email' => 'visitor@example.com',
            'message' => 'Please contact me.',
        ]);

        Sanctum::actingAs($facilitator);
        $this->getJson('/api/v1/contact-inquiries')->assertForbidden();
        $this->patchJson("/api/v1/contact-inquiries/{$inquiry->id}", [
            'status' => 'closed',
        ])->assertForbidden();
    }

    public function test_submission_emails_staff_and_the_visitor(): void
    {
        Mail::fake();
        Notification::fake();
        $manager = $this->staff('Manager', 'manager');
        $admin = $this->staff('Admin', 'admin');
        $inquiry = ContactInquiry::create([
            'name' => 'Website Visitor',
            'email' => 'visitor@example.com',
            'message' => 'Please contact me.',
        ]);

        (new SendContactInquiryEmails)->handle(new ContactInquirySubmitted($inquiry));

        Notification::assertSentTo(
            [$manager, $admin],
            PortalNotification::class,
            fn (PortalNotification $notification) => $notification->category === 'enquiry',
        );
        Mail::assertSent(ContactInquiryConfirmation::class, function ($mail) use ($inquiry) {
            return $mail->hasTo($inquiry->email);
        });
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
