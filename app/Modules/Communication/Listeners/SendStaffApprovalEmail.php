<?php

namespace App\Modules\Communication\Listeners;

use App\Modules\Communication\Notifications\PortalNotification;
use App\Modules\Identity\Domain\Events\StaffAccountApproved;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;

final class SendStaffApprovalEmail implements ShouldHandleEventsAfterCommit
{
    public function handle(StaffAccountApproved $event): void
    {
        $event->staff->notify(new PortalNotification(
            'staff',
            'Staff Account Approved',
            'Your VIVA DIGITAL CENTER staff account has been approved.',
            '/dashboard',
        ));
    }
}
