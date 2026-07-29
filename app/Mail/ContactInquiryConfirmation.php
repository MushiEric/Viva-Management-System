<?php

namespace App\Mail;

use App\Modules\Communication\Infrastructure\Models\ContactInquiry;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContactInquiryConfirmation extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public ContactInquiry $inquiry) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'We Received Your VIVA Digital Center Enquiry');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.contact-inquiry-confirmation');
    }

    public function attachments(): array
    {
        return [];
    }
}
