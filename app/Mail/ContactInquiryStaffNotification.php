<?php

namespace App\Mail;

use App\Modules\Communication\Infrastructure\Models\ContactInquiry;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContactInquiryStaffNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public ContactInquiry $inquiry) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            replyTo: [new Address($this->inquiry->email, $this->inquiry->name)],
            subject: "New Website Enquiry — {$this->inquiry->name}",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.contact-inquiry-staff');
    }

    public function attachments(): array
    {
        return [];
    }
}
