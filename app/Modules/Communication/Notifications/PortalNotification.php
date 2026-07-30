<?php

namespace App\Modules\Communication\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

final class PortalNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $category,
        public readonly string $title,
        public readonly string $message,
        public readonly ?string $actionUrl = null,
        public readonly array $metadata = [],
    ) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if ($notifiable->email_notifications_enabled && $notifiable->email) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject($this->title)
            ->greeting("Hello {$notifiable->name},")
            ->line($this->message);

        if ($this->actionUrl) {
            $portalUrl = rtrim((string) config('app.frontend_url', config('app.url')), '/');
            $mail->action('Open VIVA Portal', $portalUrl.$this->actionUrl);
        }

        return $mail->line('This message was sent from VIVA DIGITAL CENTER.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'category' => $this->category,
            'title' => $this->title,
            'message' => $this->message,
            'action_url' => $this->actionUrl,
            'metadata' => $this->metadata,
        ];
    }
}
